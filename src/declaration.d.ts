declare module '*.png' {
    const value: string;
    export default value;
}

declare module '*.jpeg' {
    const value: string;
    export default value;
}

declare module '*.jpg' {
    const value: string;
    export default value;
}

declare module '*.scss' {
    const content: { [className: string]: string };
    export default content;
}

declare module '*.css';

declare module 'bootstrap/dist/js/bootstrap.bundle.min.js';