const { copyFile } = require("fs").promises;
const join = require("path").join;

function build(extractPath, electronVersion, platform, arch, done) {
  let fileList;

  switch (platform) {
    case "win32":
      fileList = ["fire_window.exe", "relay_window.exe"];
      break;
    case "darwin":
      fileList = ["fire_darwin", "relay_darwin"];
      break;
    case "linux":
      fileList = ["fire_linux", "relay_linux"];
      break;
    default:
      throw new Error("Platform doesn't supported");
  }

  const promise = Promise.all(
    fileList.map((fileName) =>
      copyFile(
        join(__dirname, "../bin", fileName),
        join(extractPath, "resources", fileName)
      )
    )
  );

  promise.then(() => done());
}

module.exports = build;
