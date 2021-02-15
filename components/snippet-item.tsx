import React, {Dispatch, SetStateAction, useState} from 'react';
import {DatedObj, SnippetObj, UserObj} from "../utils/types";
import {format} from "date-fns";
import Parser from "html-react-parser";
import MoreMenu from "./more-menu";
import MoreMenuItem from "./more-menu-item";
import {FiEdit2, FiTrash} from "react-icons/fi";
import showdown from "showdown";
import showdownHtmlEscape from "showdown-htmlescape";
import SpinnerButton from "./spinner-button";
import axios from "axios";
import UpModal from "./up-modal";
import SimpleMDEEditor from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import {useSession} from "next-auth/client";
import Link from "next/link";

export default function SnippetItem({snippet, authors, iteration, setIteration}: {
    snippet: DatedObj<SnippetObj>,
    authors: DatedObj<UserObj>[],
    iteration: number,
    setIteration: Dispatch<SetStateAction<number>>
}) {
    const [session, loading] = useSession();
    const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [body, setBody] = useState<string>(snippet.body);
    const [url, setUrl] = useState<string>(snippet.url);
    const [isEditLoading, setIsEditLoading] = useState<boolean>(false);

    const markdownConverter = new showdown.Converter({
        strikethrough: true,
        tasklists: true,
        tables: true,
        extensions: [showdownHtmlEscape],
    });

    function onDelete() {
        setIsLoading(true);

        axios.post("/api/project/snippet/delete", {
            id: snippet._id.toString(),
        }).then(() => {
            setIsLoading(false);
            setIsDeleteOpen(false);
            setIteration(iteration + 1);
        }).catch(e => {
            setIsLoading(false);
            console.log(e);
        });
    }

    function onCancelEdit() {
        setIsEdit(false);
        setBody(snippet.body);
        setUrl(snippet.url);
    }

    function onSaveEdit() {
        setIsEditLoading(true);

        axios.post("/api/project/snippet/edit", {
            id: snippet._id,
            body: body || "",
            url: url || "",
        }).then(() => {
            setIteration(iteration + 1);
            setIsEditLoading(false);
            setIsEdit(false);
        }).catch(e => {
            console.log(e);
            setIsEditLoading(false);
        });
    }

    return (
        <>
            <div className={"py-8 border-b transition md:flex" + (isEdit ? "" : " hover:bg-gray-50")}>
                {!isEdit && (
                    <div className="flex ml-auto mb-4 order-3">
                        <div className="md:hidden flex items-center">
                            {!(session && session.userId === snippet.userId) && (
                                <Link href={`/@${authors.find(d => d._id === snippet.userId).username}`}>
                                    <a>
                                        <img
                                            src={authors.find(d => d._id === snippet.userId).image}
                                            alt={authors.find(d => d._id === snippet.userId).name}
                                            className="w-6 h-6 rounded-full opacity-25 hover:opacity-100 transition mr-4"
                                        />
                                    </a>
                                </Link>
                            )}
                            <p className="opacity-25">
                                {format(new Date(snippet.createdAt), "h:mm a")}
                            </p>
                        </div>
                        {session && (session.userId === snippet.userId) && (
                            <div className="ml-auto">
                                <MoreMenu>
                                    <MoreMenuItem text="Edit" icon={<FiEdit2/>} onClick={() => setIsEdit(true)}/>
                                    <MoreMenuItem text="Delete" icon={<FiTrash/>} onClick={() => setIsDeleteOpen(true)}/>
                                </MoreMenu>
                                <UpModal isOpen={isDeleteOpen} setIsOpen={setIsDeleteOpen}>
                                    <p>Are you sure you want to delete this snippet? This cannot be undone.</p>
                                    <div className="flex mt-4">
                                        <SpinnerButton isLoading={isLoading} onClick={onDelete}>
                                            Delete
                                        </SpinnerButton>
                                        <button className="up-button text" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
                                    </div>
                                </UpModal>
                            </div>
                        )}
                    </div>
                )}
                <div className="hidden md:block w-32 mt-1">
                    {!(session && session.userId === snippet.userId) && (
                        <Link href={`/@${authors.find(d => d._id === snippet.userId).username}`}>
                            <a>
                                <img
                                    src={authors.find(d => d._id === snippet.userId).image}
                                    alt={authors.find(d => d._id === snippet.userId).name}
                                    className="w-6 h-6 rounded-full mb-4 opacity-25 hover:opacity-100 transition"
                                />
                            </a>
                        </Link>
                    )}
                    <p className="opacity-25">
                        {format(new Date(snippet.createdAt), "h:mm a")}
                    </p>
                </div>
                <div className="w-full">
                    {snippet.url && ((isEdit && session && session.userId === snippet.userId) ? (
                        <input
                            type="text"
                            className="content px-4 py-2 border rounded-md w-full mb-8"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="Resource URL"
                        />
                    ) : (
                        <div className="p-4 rounded-md shadow-md content mb-8 inline-block">
                            <span>{snippet.url}</span>
                        </div>
                    ))}
                        {(isEdit && session && session.userId === snippet.userId) ? (
                            <>
                                <div className="content prose w-full">
                                    <SimpleMDEEditor
                                        value={body}
                                        onChange={setBody}
                                        options={{
                                            spellChecker: false,
                                            placeholder: snippet.type === "snippet" ? "Write down an interesting thought or development" : "Jot down some notes about this resource",
                                            toolbar: ["bold", "italic", "strikethrough", "|", "heading-1", "heading-2", "heading-3", "|", "link", "quote", "unordered-list", "ordered-list", "|", "guide"],
                                        }}
                                    />
                                </div>
                                <div className="flex mt-4">
                                    <SpinnerButton isLoading={isEditLoading} onClick={onSaveEdit}>
                                        Save
                                    </SpinnerButton>
                                    <button className="up-button text" onClick={onCancelEdit}>Cancel</button>
                                </div>
                            </>
                        ) : (
                            <div className="content prose">
                                {Parser(markdownConverter.makeHtml(snippet.body))}
                            </div>
                        )}
                </div>
            </div>
        </>
    );
}