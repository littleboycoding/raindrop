import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { decode } from "@msgpack/msgpack";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import Relay from "./interface/relay";
import { checkBin, DecodedData, DecodedErrorData } from "./interface/utils";
import fs from "fs";
import { promisify } from "util";
import path from "path";
import os from "os";

const stat = promisify(fs.stat);
let isScanning = false;
let isSending = false;
let relayOpen = true;
let fireBin = "fire";

const VARIABLE = {
  name: "Anonymous",
  port: "2001",
  targetPort: "2001",
  adapter: "",
};

const DEV = process.env.NODE_ENV === "development";

//Helper function
async function msgpackDecoder<T>(data: any): Promise<T> {
  try {
    const decoded = decode(data) as T;
    return decoded;
  } catch (err) {
    const error: DecodedErrorData = {
      Title: "msgpack-decode-error",
      Error: err,
    };
    throw error;
  }
}

function writeSetting() {
  fs.rm(path.join(__dirname, "setting.json"), () => {
    fs.writeFile(
      path.join(__dirname, "setting.json"),
      JSON.stringify(VARIABLE),
      (err) => {
        if (err) console.error(err);
      }
    );
  });
}

function windowHandler(window: BrowserWindow) {
  let setting;
  try {
    setting = JSON.parse(
      fs.readFileSync(path.join(__dirname, "setting.json"), {
        encoding: "utf-8",
      })
    ) as typeof VARIABLE;
    VARIABLE.name = setting.name;
    VARIABLE.port = setting.port;
    VARIABLE.targetPort = setting.targetPort;
    VARIABLE.adapter = setting.adapter;
  } catch (e) {
    writeSetting();
  }

  let bin: string;
  switch (process.platform) {
    case "win32":
      bin = "fire_window.exe";
      break;
    case "darwin":
      bin = "fire_darwin";
      break;
    case "linux":
      bin = "fire_linux";
      break;
    default:
      app.exit(1);
      break;
  }
  fireBin = checkBin(bin);

  let relay = new Relay(
    VARIABLE.name,
    VARIABLE.targetPort,
    VARIABLE.port,
    VARIABLE.adapter
  );
  let webContents = window.webContents;
  let scanner: ChildProcessWithoutNullStreams;

  relayHandler(relay, window.webContents);

  ipcMain.on("restart", () => {
    if (DEV) {
      window.reload();
      relay.restart();
      relayOpen = true;
    } else {
      app.relaunch();
      app.exit(0);
    }
  });

  function rescan() {
    if (isScanning) return;
    isScanning = true;

    let args = ["--msgpack", "--port", VARIABLE.targetPort];
    if (VARIABLE.adapter) {
      args = [...args, "--dev", VARIABLE.adapter];
    }
    if (DEV || process.env.INCLUDED_MYSELF === "true") {
      args = [...args, "--include"];
    }
    scanner = spawn(fireBin, [...args, "scan"]);

    scanner.stdout.on("data", (data) => {
      const decoded = msgpackDecoder<DecodedData>(data);
      decoded
        .then((res) => {
          webContents.send("RESCAN_DATA", res.Data);
        })
        .catch((err) => {
          webContents.send("error", err);
        });
    });

    scanner.stderr.on("data", (data) => {
      const decoded = msgpackDecoder(data);
      decoded
        .then((res) => {
          webContents.send("error", res);
        })
        .catch((err) => {
          webContents.send("error", err);
        });
    });

    scanner.on("close", () => {
      isScanning = false;
      webContents.send("RESCAN_CLOSED");
    });
  }

  ipcMain.on("RESCAN", rescan);

  ipcMain.on("stop-scan", () => {
    scanner.kill("SIGINT");
  });

  ipcMain.handle("SELECT_FILE", async (_, args) => {
    const files = await dialog.showOpenDialog({
      properties: ["multiSelections"],
    });

    if (!files.canceled) {
      const filesList = await Promise.all(
        files.filePaths.map((file) => stat(file))
      );

      const mappedFiles = filesList.map((file, index) => {
        return {
          Filename: path.basename(files.filePaths[index]),
          FullPath: files.filePaths[index],
          Size: file.size,
        };
      });

      return mappedFiles;
    } else {
      return [];
    }
  });

  ipcMain.handle("select-directory", async (): Promise<string> => {
    const dir = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (!dir.canceled) {
      return dir.filePaths[0];
    } else {
      return "";
    }
  });

  ipcMain.on("send-file", (_, files, address) => {
    const fileJoined = files.map((file: { FullPath: string }) => file.FullPath);

    const ls = spawn(fireBin, [
      "--msgpack",
      "--port",
      VARIABLE.targetPort,
      "--name",
      VARIABLE.name,
      "send",
      address,
      ...fileJoined,
    ]);

    isSending = true;

    ls.stdout.on("data", (data) => {
      const decoded = msgpackDecoder<DecodedData>(data);
      decoded
        .then((res) => {
          webContents.send("status", res.Data);
        })
        .catch((err) => {
          webContents.send("error", err);
        });
    });

    ls.stderr.on("data", (data) => {
      const decoded = msgpackDecoder<DecodedErrorData>(data);
      decoded
        .then((res) => {
          let search = res.Error.Err.search(
            "No connection could be made because the target machine actively refused it."
          );
          if (search !== -1) {
            webContents.send("status", "Couldn't connect to host");
          } else {
            webContents.send("error", res);
          }
        })
        .catch((err) => {
          webContents.send("error", err);
        });
    });

    ls.on("close", () => {
      isSending = false;
    });
  });

  ipcMain.on("accept-file", (_, dir: string) => {
    relay.writer("y\n");

    relay.once("action", (data: DecodedData) => {
      if (data.Title === "FILE_DESTINATION") {
        relay.writer(dir + "\n");
      }
    });
  });

  ipcMain.handle("get-interfaces", () => {
    const ifaces = os.networkInterfaces();

    return Object.keys(ifaces);
  });

  ipcMain.on(
    "setting-variable",
    (_: any, key: "name" | "targetPort" | "port" | "adapter", prop: any) => {
      VARIABLE[key] = prop;
      relay[key] = prop;

      writeSetting();

      if (relayOpen) relay.restart();
    }
  );

  ipcMain.handle("get-variable", () => {
    return VARIABLE;
  });

  ipcMain.on("close", () => {
    relay.close();
    app.exit(1);
  });
}

function relayHandler(relay: Relay, webContent: Electron.WebContents) {
  relay.on("action", (data: DecodedData) => {
    switch (data.Title) {
      case "ACCEPT_FILE":
        if (DEV || !isSending) {
          webContent.send("relay-action", data);
        } else {
          relay.writer("n\n");
        }
        break;
      case "FILE_WRITTEN":
        webContent.send("status", "Files written");
        break;
    }
  });

  relay.on("error", (data: DecodedErrorData) => {
    webContent.send("error", data);
  });

  relay.on("close", () => {
    webContent.send("relay-close");
  });

  ipcMain.on("relay-toggle", () => {
    if (relayOpen) {
      relayOpen = false;
      relay.close();
    } else {
      relayOpen = true;
      relay.spawner();
    }
  });

  ipcMain.on("relay-restart", () => {
    relay.restart();
  });

  ipcMain.on("write", (_, msg: string) => {
    relay.writer(msg);
  });
}

export { windowHandler };
