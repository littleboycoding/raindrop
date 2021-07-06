import EventEmitter from "events";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { decode } from "@msgpack/msgpack";
import { DecodedData, DecodedErrorData, checkBin } from "./utils";
import { app } from "electron";

class Relay extends EventEmitter {
  private ls: ChildProcessWithoutNullStreams;
  private bin: string;

  constructor(
    public name: string,
    public port: string,
    public adapter: string
  ) {
    super();
    let bin: string;
    switch (process.platform) {
      case "win32":
        bin = "relay_window.exe";
        break;
      case "darwin":
        bin = "relay_darwin";
        break;
      case "linux":
        bin = "relay_linux";
        break;
      default:
        app.exit(1);
        break;
    }

    this.bin = checkBin(bin);

    this.spawner();
  }

  public spawner() {
    let args = ["--msgpack", "--name", this.name, "--port", this.port];
    if (this.adapter) {
      args = [...args, "--dev", this.adapter];
    }
    try {
      this.ls = spawn(this.bin, args);
    } catch {
      app.exit(1);
    }
    this.onEventEmitted();
  }

  public close() {
    return this.ls.kill("SIGINT");
  }

  public restart() {
    this.close();
    this.spawner();
  }

  private emitter(data: any, isError: boolean) {
    try {
      const decoded = decode(data) as DecodedData | DecodedErrorData;
      this.emit(isError ? "error" : "action", decoded);
    } catch (err) {
      const error: DecodedErrorData = {
        Title: "msgpack-decode-error",
        Error: err,
      };
      this.emit("error", error);
    }
  }

  public writer(msg: string) {
    this.ls.stdin.write(msg);
  }

  private onEventEmitted() {
    this.ls.stdout.on("data", (data) => this.emitter(data, false));
    this.ls.stderr.on("data", (data) => this.emitter(data, true));
    this.ls.on("close", () => this.emit("close"));
  }
}

export default Relay;
