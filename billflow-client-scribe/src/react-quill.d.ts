declare module 'react-quill' {
    import React from 'react';

    export interface ReactQuillProps {
        theme?: string;
        modules?: any;
        formats?: string[];
        value?: string;
        placeholder?: string;
        onChange?: (content: string, delta: any, source: string, editor: any) => void;
        className?: string;
    }

    export default class ReactQuill extends React.Component<ReactQuillProps> { }
}
