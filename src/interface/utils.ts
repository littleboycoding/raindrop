import path from "path";
import fs from "fs";
import { app } from "electron";

interface DecodedData {
  Title: string;
  Data: any;
}

interface DecodedErrorData {
  Title: string;
  Error: any;
}

function checkBin(bin: string): string {
  const tryPath = [
    path.resolve(app.getAppPath(), "..", bin),
    path.resolve(app.getAppPath(), "bin", bin),
  ];

  for (let i = 0; i < tryPath.length; i++) {
    const exist = fs.existsSync(tryPath[i]);
    if (exist) return tryPath[i];
  }

  return bin;
}

export { DecodedData, DecodedErrorData, checkBin };
