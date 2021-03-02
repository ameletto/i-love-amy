import {NextApiRequest, NextApiResponse} from "next";
import {getSession} from "next-auth/client";
import {SnippetModel} from "../../models/snippet";
import {ProjectModel} from "../../models/project";
import {SnippetObj} from "../../utils/types";
import {UserModel} from "../../models/user";
import {ImageModel} from "../../models/image";
import {deleteImages} from "../../utils/deleteImages";
import {PostModel} from "../../models/post";
import dbConnect from "../../utils/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (["POST", "DELETE"].includes(req.method)) {
        const session = await getSession({ req });

        if (!session || !session.userId) {
            return res.status(403).json({message: "You must be logged in to edit snippets."});
        }

        try {
            await dbConnect();

            let thisProject: any = null;
            let thisSnippet: any = null; // any typing for mongoose condition type thing

            if (!req.body.projectId && !req.body.id) return res.status(406).json({message: "No project or snippet ID found in request."});

            // if delete or update, we have snippet id. otherwise we have project id
            if (req.body.id) {
                thisSnippet = await SnippetModel.findOne({ _id: req.body.id });

                if (!thisSnippet) return res.status(406).json({message: "No snippet found with given ID."});

                thisProject = await ProjectModel.findOne({ _id: thisSnippet.projectId });

            } else {
                thisProject = await ProjectModel.findOne({ _id: req.body.projectId });
            }

            // check permission
            if ((thisProject.userId.toString() !== session.userId) && !thisProject.collaborators.map(d => d.toString()).includes(session.userId)) return res.status(403).json({msesage: "You do not have permission to save snippets in this project."})

            // if update or create, else delete
            if (req.method === "POST") {
                // ensure necessary post params are present
                if (!req.body.urlName) return res.status(406).json({message: "No snippet urlName found in request."});
                if (req.body.type === "snippet" && !req.body.body) return res.status(406).json({message: "No snippet body found in request."});
                if (req.body.type === "resource" && !req.body.url) return res.status(406).json({message: "No resource URL found in request."});

                // delete any images that have been removed
                const attachedImages = await ImageModel.find({attachedUrlName: req.body.urlName});

                if (attachedImages.length) {
                    const unusedImages = attachedImages.filter(d => !req.body.body.includes(d.key));
                    await deleteImages(unusedImages);
                }

                // create new availableTags in project
                const newTags = req.body.tags.filter(d => !thisProject.availableTags.includes(d));
                if (newTags.length) {
                    thisProject.availableTags = [...thisProject.availableTags, ...newTags];
                    thisProject.markModified("availableTags");
                    await thisProject.save();
                }

                // if update, else new
                if (req.body.id) {
                    thisSnippet.body = req.body.body || "";
                    thisSnippet.url = req.body.url || "";
                    thisSnippet.tags = req.body.tags || [];

                    await thisSnippet.save();
                } else {
                    const newSnippet: SnippetObj = {
                        urlName: req.body.urlName,
                        projectId: req.body.projectId,
                        type: req.body.type,
                        body: req.body.body || "",
                        date: new Date().toISOString(),
                        url: req.body.url || "",
                        tags: req.body.tags,
                        likes: [],
                        userId: session.userId,
                        linkedPosts: [],
                    }

                    await SnippetModel.create(newSnippet);
                }

                res.status(200).json({message: "Snippet successfully saved.", newTags: newTags});

                return;
            } else {
                // get snippet to use urlName
                const thisSnippet = await SnippetModel.findOne({ _id: req.body.id });
                if (!thisSnippet) return res.status(404).json({message: "No snippet found at given ID"});

                // delete any attached images
                const attachedImages = await ImageModel.find({ attachedUrlName: thisSnippet.urlName });

                await deleteImages(attachedImages);

                // delete snippet
                await SnippetModel.deleteOne({ _id: req.body.id });

                res.status(200).json({message: "Snippet successfully deleted."});

                return;
            }
        }

         catch (e) {
            return res.status(500).json({message: e});
        }
    } else if (req.method === "GET") {

        if (!req.query.projectId && !req.query.ids) return res.status(406).json({message: "No project ID or snippet IDs found in request"});
        if (Array.isArray(req.query.search) || Array.isArray(req.query.tags) || Array.isArray(req.query.userIds) || Array.isArray(req.query.ids)) return res.status(406).json({message: "Invalid filtering queries found in request"});

        try {
            await dbConnect();

            let conditions: any = { projectId: req.query.projectId };
            if (req.query.search) conditions["$text"] = {"$search": req.query.search};
            if (req.query.tags && JSON.parse(req.query.tags).length) conditions["tags"] = {"$in": JSON.parse(req.query.tags)};
            if (req.query.userIds && JSON.parse(req.query.userIds).length) conditions["userId"] = {"$in": JSON.parse(req.query.userIds)};
            if (req.query.ids && JSON.parse(req.query.ids).length) {
                const ids: any = JSON.parse(req.query.ids);
                conditions = { "_id": {"$in": ids}};
            }

            const cursor = SnippetModel
                .find(conditions)
                .sort({"createdAt": req.query.sort ? +req.query.sort : - 1});

            const snippets = await (req.query.page ?
                cursor
                    .skip((+req.query.page - 1) * 10)
                    .limit(10) :
                cursor
            );

            const count = await SnippetModel
                .find(conditions)
                .count();

            // get associated authors
            const authorIds = snippets.map(d => d.userId);
            const uniqueAuthorIds = authorIds.filter((d, i, a) => a.findIndex(x => x === d) === i);
            const authors = await UserModel.find({ _id: {$in: uniqueAuthorIds }});

            // get associated posts
            const postIds = snippets.reduce((a, b) => a = [...a, ...b.linkedPosts], []);
            const uniquePostIds = postIds.filter((d, i, a) => a.findIndex(x => x === d) === i);
            const posts = await PostModel.find({ _id: {$in: uniquePostIds }});

            res.status(200).json({snippets: snippets, authors: authors, count: count, posts: posts });

            return;
        } catch (e) {
            return res.status(500).json({message: e});
        }
    } else {
        return res.status(405);
    }
}