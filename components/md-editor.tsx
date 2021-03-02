import React, {Dispatch, SetStateAction} from "react";
import {simpleMDEToolbar} from "../utils/utils";
import SimpleMDEEditor from "react-simplemde-editor";

export default function MDEditor({body, setBody, imageUploadEndpoint, placeholder}: {
    body: string,
    setBody: Dispatch<SetStateAction<string>>,
    imageUploadEndpoint: string,
    placeholder: string,
}) {
    return (
        <SimpleMDEEditor
            value={body}
            onChange={setBody}
            options={{
                spellChecker: false,
                placeholder: placeholder,
                toolbar: simpleMDEToolbar,
                previewClass: "bg-white",
                uploadImage: true,
                imageUploadEndpoint: imageUploadEndpoint,
            }}
        />
    );
}