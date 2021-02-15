import {getSession, useSession} from "next-auth/client";
import {GetServerSideProps} from "next";
import Link from "next/link";
import {FiPlus} from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import useSWR, {responseInterface} from "swr";
import {fetcher} from "../utils/utils";
import {DatedObj, ProjectObj, UserObj} from "../utils/types";
import UpSEO from "../components/up-seo";

export default function Projects({}: {  }) {
    const {data: projects, error: projectsError}: responseInterface<{projects: ProjectObj[] }, any> = useSWR("/api/project", fetcher);
    const {data: sharedProjects, error: sharedProjectsError}: responseInterface<{projects: DatedObj<ProjectObj>[], owners: DatedObj<UserObj>[] }, any> = useSWR("/api/project?shared=true", fetcher);
    const [session, loading] = useSession();

    console.log(sharedProjects);

    return (
        <div className="max-w-4xl mx-auto px-4">
            <UpSEO title="Projects | Updately"/>
            <div className="flex items-center">
                <h1 className="up-h1">Projects</h1>
                <Link href="/projects/new">
                    <a className="up-button small ml-auto">
                        <div className="flex items-center">
                            <FiPlus/>
                            <span className="ml-2">New project</span>
                        </div>
                    </a>
                </Link>
            </div>
            <hr className="my-8"/>
            <h3 className="up-ui-title mb-4">Your projects</h3>
            {((!projects && !projectsError) || loading) ? ( // SWR projects loading
                <Skeleton count={10}/>
            ) : (projects.projects.length === 0) ? ( // loaded, no projects
                <p className="opacity-50">Hit "New project" to create a new project!</p>
            ) : (
                <div className="md:flex -mx-4">
                    {projects.projects.map(project => (
                        <Link href={`/@${session.username}/${project.urlName}`}>
                            <a className="block p-4 shadow-md rounded-md md:w-1/3 mx-4 mb-8 md:mb-0">
                                <h3 className="up-ui-item-title leading-tight mb-2">{project.name}</h3>
                                <p className="opacity-50">{project.description}</p>
                            </a>
                        </Link>
                    ))}
                </div>
            )}
            <hr className="my-8"/>
            <h3 className="up-ui-title mb-4">Shared with you</h3>
            {((!sharedProjects && !sharedProjectsError) || loading) ? ( // SWR projects loading
                <Skeleton count={10}/>
            ) : (sharedProjects.projects.length === 0) ? ( // loaded, no projects
                <p className="opacity-50">No projects have been shared with you</p>
            ) : (
                <div className="md:flex -mx-4">
                    {sharedProjects.projects.map(project => (
                        <Link href={`/@${sharedProjects.owners.find(d => d._id === project.userId).username}/${project.urlName}`}>
                            <a className="block p-4 shadow-md rounded-md md:w-1/3 mx-4 mb-8 md:mb-0">
                                <h3 className="up-ui-item-title leading-tight mb-2">{project.name}</h3>
                                <div className="flex items-center my-4">
                                    <img
                                        src={sharedProjects.owners.find(d => d._id === project.userId).image}
                                        alt={sharedProjects.owners.find(d => d._id === project.userId).name}
                                        className="w-10 w-10 rounded-full mr-4"
                                    />
                                    <p>{sharedProjects.owners.find(d => d._id === project.userId).name}</p>
                                </div>
                                <p className="opacity-50">{project.description}</p>
                            </a>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getSession(context);

    if (!session || !session.userId) {
        context.res.setHeader("location", session ? "/auth/newaccount" : "/auth/signin");
        context.res.statusCode = 302;
        context.res.end();
    }

    return {props: {}};
};