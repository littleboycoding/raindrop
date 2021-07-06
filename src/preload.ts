import { contextBridge, ipcRenderer, OpenDialogReturnValue } from "electron";
import { DecodedData, DecodedErrorData } from "./interface/utils";

declare global {
  interface Window {
    electron: typeof API;
  }
}

interface Files {
  Filename: string;
  FullPath?: string;
  Size: number;
}

function scan() {
  ipcRenderer.send("RESCAN");
}

function stopScan() {
  ipcRenderer.send("stop-scan");
}

function onFoundAddress(callback: (address: string) => void): () => void {
  const fn = (_: any, addr: any) => {
    callback(addr);
  };

  ipcRenderer.on("RESCAN_DATA", fn);

  return () => {
    ipcRenderer.off("RESCAN_DATA", fn);
  };
}

function onFinishedScan(callback: () => void) {
  ipcRenderer.once("RESCAN_CLOSED", () => callback());
}

function selectFiles(address: string): Promise<Files[]> {
  return ipcRenderer.invoke("SELECT_FILE", address) as Promise<Files[]>;
}

function onAction(event: string, callback: (data: DecodedData) => void) {
  const fn = (_: any, data: DecodedData) => {
    if (data.Title === event) {
      callback(data);
    }
  };

  ipcRenderer.on("relay-action", fn);

  return () => ipcRenderer.off("relay-action", fn);
}

function onError(callback: (data: DecodedErrorData) => void): () => void {
  const fn = (_: any, data: DecodedErrorData) => {
    callback(data);
  };

  ipcRenderer.on("error", fn);

  return () => {
    ipcRenderer.off("error", fn);
  };
}

function writeOut(msg: string) {
  ipcRenderer.send("write", msg);
}

function restart() {
  ipcRenderer.send("restart");
}

function sendFile(files: Files[], address: string) {
  ipcRenderer.send("send-file", files, address);
}

function selectDirectory(): Promise<string> {
  return ipcRenderer.invoke("select-directory") as Promise<string>;
}

function acceptFiles(dir: string) {
  ipcRenderer.send("accept-file", dir);
}

function onStatus(callback: (...args: any[]) => any) {
  const fn = (_: any, data: DecodedErrorData) => {
    callback(data);
  };

  ipcRenderer.on("status", fn);

  return () => {
    ipcRenderer.off("status", fn);
  };
}

function relayToggle() {
  ipcRenderer.send("relay-toggle");
}

function relayRestart() {
  ipcRenderer.send("relay-restart");
}

async function getInterfaces() {
  const ifaces = ipcRenderer.invoke("get-interfaces");

  return ifaces;
}

async function getVariable() {
  const variable = ipcRenderer.invoke("get-variable");

  return variable;
}

function settingVariable(key: "name" | "port" | "adapter", prop: string) {
  ipcRenderer.send("setting-variable", key, prop);
}

function close() {
  ipcRenderer.send("close");
}

const API = {
  selectFiles,
  selectDirectory,
  getVariable,
  settingVariable,
  getInterfaces,
  restart,
  onError,
  onStatus,
  close,
  fire: {
    scan,
    stopScan,
    onFoundAddress,
    onFinishedScan,
    sendFile,
  },
  relay: {
    writeOut,
    onAction,
    acceptFiles,
    relayToggle,
    relayRestart,
  },
};

contextBridge.exposeInMainWorld("electron", API);

export { Files };
