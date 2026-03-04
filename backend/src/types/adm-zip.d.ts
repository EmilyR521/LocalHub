declare module 'adm-zip' {
  class AdmZip {
    constructor(pathOrBuffer?: string | Buffer);
    addFile(entryPath: string, content: Buffer, comment?: string): void;
    getEntries(): { entryName: string; isDirectory: boolean; getData: () => Buffer }[];
    toBuffer(): Buffer;
  }
  export = AdmZip;
}
