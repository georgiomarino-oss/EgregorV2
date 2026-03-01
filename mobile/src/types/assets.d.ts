type ImageModule = number | { uri: string };

declare module '*.png' {
  const content: ImageModule;
  export default content;
}

declare module '*.jpg' {
  const content: ImageModule;
  export default content;
}

declare module '*.jpeg' {
  const content: ImageModule;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
