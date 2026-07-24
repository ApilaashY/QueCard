import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 20 });
console.log(splitter.splitText("hello world"));
