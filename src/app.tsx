import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  createContext,
  useContext,
} from "react";
import * as ReactDOM from "react-dom";
import styled, { keyframes } from "styled-components";
import { Files } from "./preload";

//Assets
import water from "./assets/Water.svg";
import directory from "./assets/Directory.svg";
import { DecodedData, DecodedErrorData } from "./interface/utils";

const DEV = process.env.NODE_ENV === "development";
interface NetworkDevice {
  address: string;
  name: string;
}

const DialogContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  .title {
    font-size: 24px;
  }

  .hint {
    font-size: 14px;
  }
`;

const Status = styled(DialogContent)`
  align-items: center;
`;

const SettingDialog = styled(DialogContent)`
  input,
  select {
    width: 100%;
    padding: 5px 10px;
    border: none;
    border-radius: 5px;
    color: #345971;
  }
`;

function useInterfaces(): any[] {
  const [ifaces, setIfaces] = useState<any[]>(null);

  useEffect(() => {
    const promise = window.electron.getInterfaces() as Promise<any[]>;
    let resolved: boolean = false;

    promise.then((ifaces) => {
      resolved = true;
      setIfaces(ifaces);
    });

    return () => {
      if (!resolved) Promise.reject(promise);
    };
  }, []);

  return ifaces;
}

interface Setting {
  name: string;
  port: string;
  adapter: string;
}

function useSetting(): [Setting, (setting: Setting) => void] {
  const [setting, setSetting] = useState<Setting>(null);

  useEffect(() => {
    const promise = window.electron.getVariable() as Promise<Setting>;
    let resolved: boolean = false;

    promise.then((variable) => {
      resolved = true;
      setSetting(variable);
    });

    return () => {
      if (!resolved) Promise.reject(promise);
    };
  }, []);

  return [setting, setSetting];
}

function SettingDialogStyled() {
  const ctx = useContext(CTX);
  const ifaces = useInterfaces();
  const [setting, setSetting] = useSetting();

  function handlePortChange(event: any) {
    const newSetting = { ...setting };
    newSetting.port = event.target.value;

    setSetting(newSetting);
  }

  function handleAdapterChange(event: any) {
    const newSetting = { ...setting };
    newSetting.adapter = event.target.value;

    setSetting(newSetting);
  }

  function apply() {
    window.electron.settingVariable("port", setting.port);
    window.electron.settingVariable("adapter", setting.adapter);
    ctx.setDialog(null);
  }

  if (setting === null || ifaces === null) {
    return (
      <SettingDialog>
        <span className="hint">
          Loading
          <LoadingDot />
        </span>
      </SettingDialog>
    );
  }

  return (
    <SettingDialog>
      <span className="title">Setting</span>
      <span className="hint">choose preference</span>
      <Row gap={10} justifyContent="space-between">
        Port{" "}
        <input
          onChange={handlePortChange}
          type="text"
          pattern="[0-9]"
          maxLength={5}
          placeholder="Port"
          required
          value={setting.port}
        />
      </Row>
      <Row gap={10} justifyContent="space-betweet">
        Adapter{" "}
        <select onChange={handleAdapterChange} value={setting.adapter || ""}>
          {setting.adapter && (
            <option key="default" value={setting.adapter}>
              {setting.adapter}
            </option>
          )}
          <option key="all" value="">
            All
          </option>
          {ifaces.map((iface) =>
            setting.adapter !== iface ? (
              <option key={iface} value={iface}>
                {iface}
              </option>
            ) : null
          )}
        </select>
      </Row>
      <Row justifyContent="flex-end">
        <Button onClick={apply}>Apply</Button>
      </Row>
    </SettingDialog>
  );
}

const CTX = createContext<{
  setDialog: (elm: JSX.Element) => void;
  name: string;
}>({
  setDialog: null,
  name: "Anonymous",
});

const NetworkDirectory = styled.main`
  color: #8c772b;
  padding: 50px 160px;
  display: grid;
  gap: 50px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  @media (max-width: 800px) {
    & {
      padding: 50px 50px;
    }
  }
`;

const popupAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0)
  }

  to {
    opacity: 1;
    transform: scale(1)
  }
`;

const Directory = styled.div<{ disable: boolean }>`
  font-size: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;

  ${(props) =>
    !props.disable &&
    `&:hover {
    cursor: pointer;
  }`}

  filter: ${(props) => (props.disable ? "grayscale(0.7)" : null)};

  animation: ${popupAnimation} 0.7s;

  .name {
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    text-align: center;
  }
`;

function DirectoryStyled(props: {
  target: NetworkDevice;
  isScanning: boolean;
}) {
  const ctx = useContext(CTX);

  const selectFiles = () => {
    ctx.setDialog(
      <SelectFileStyled
        destination={{ name: props.target.name, address: props.target.address }}
        from={ctx.name}
      />
    );
  };

  return (
    <Directory
      disable={props.isScanning}
      onClick={!props.isScanning ? selectFiles : null}
    >
      <img src={directory} alt="directory" />
      <span className="name">{props.target.name}</span>
    </Directory>
  );
}

const Header = styled.header`
  color: #345971;
  background-color: #cad9e7;
  padding: 50px 160px;
  font-weight: bold;

  display: flex;
  gap: 50px;

  @media (max-width: 800px) {
    & {
      padding: 50px 50px;
    }

    .logo {
      display: none;
    }
  }
`;

const Logo = styled.div.attrs(() => {
  return {
    className: "logo",
  };
})`
  font-size: 24px;
  display: flex;
  text-align: center;
  flex-direction: column;
`;

const Info = styled.div.attrs(() => {
  return {
    className: "info",
  };
})`
  display: flex;
  flex-direction: column;
  gap: 30px;
  font-size: 18px;

  .username {
    font-size: 36px;
  }

  .row {
    display: flex;
    gap: 20px;
  }
`;

function LogoStyled() {
  return (
    <Logo className="logo">
      <img src={water} alt="rain drop" />
      <span>Rain Drop</span>
    </Logo>
  );
}

const ClickableText = styled.span<{ disable: boolean; danger?: boolean }>`
  ${(props) =>
    !props.disable &&
    `&:hover {
    text-decoration: underline;
    }
  `}
  &:hover {
    cursor: ${(props) => (props.disable ? "not-allowed" : "pointer")};
  }
  color: ${(props) => (props.danger ? "#713434" : "#345971")};
`;

function LoadingDot() {
  const [count, setCount] = useState<number>(1);

  useEffect(() => {
    const fn = () => {
      setCount(count === 3 ? 1 : count + 1);
    };

    const timeout = setTimeout(fn, 500);
    return () => clearTimeout(timeout);
  });

  return <span>{".".repeat(count) + " ​".repeat(3 - count)}</span>;
}

function SliderStyled(props: { on: boolean; setState: () => void }) {
  function toggle() {
    props.setState();
    window.electron.relay.relayToggle();
  }

  return (
    <Slider on={props.on ? 1 : 0} onClick={toggle}>
      <div className="pad">{props.on ? "ON" : "OFF"}</div>
      <div
        key={props.on ? "on" : "off"}
        className={"thumb" + " " + (props.on ? "on" : "off")}
      ></div>
    </Slider>
  );
}

const Username = styled.input.attrs<{ name: string }>((props) => {
  return {
    type: "text",
  };
})`
  font-size: 36px;
  border: none;
  background-color: #cad9e7;
  font-weight: bold;
  color: #345971;
  padding: 0;
  min-width: 0%;
  text-overflow: ellipsis;
`;

function HeaderStyled(props: {
  setDirectory: Dispatch<SetStateAction<NetworkDevice[]>>;
  isScanning: boolean;
  rescan: () => void;
  setName: (name: string) => void;
}) {
  const [state, setState] = useState<boolean>(true);
  const ctx = useContext(CTX);
  function handleOnChange(event: any) {
    props.setName(event.target.value);
  }

  return (
    <Header>
      <LogoStyled />
      <Info>
        <Username
          maxLength={25}
          value={ctx.name}
          onChange={handleOnChange}
          onBlur={
            state
              ? (_: any) => window.electron.settingVariable("name", ctx.name)
              : null
          }
        />
        <div className="row">
          <ClickableText
            disable={props.isScanning}
            onClick={
              !props.isScanning
                ? (event: any) => ctx.setDialog(<SettingDialogStyled />)
                : null
            }
          >
            Setting
          </ClickableText>
          <ClickableText
            disable={props.isScanning}
            onClick={!props.isScanning ? props.rescan : null}
          >
            {props.isScanning ? (
              <span>
                Scanning
                <LoadingDot />
              </span>
            ) : (
              <span>Rescan</span>
            )}
          </ClickableText>
          {props.isScanning && (
            <ClickableText
              danger
              onClick={window.electron.fire.stopScan}
              disable={false}
            >
              Stop
            </ClickableText>
          )}
        </div>
        <Row alignItems="center" style={{ gap: 10 }}>
          <SliderStyled on={state} setState={() => setState(!state)} />
          This device is {!state && "not "}discoverable
        </Row>
      </Info>
    </Header>
  );
}

function NetworkDirectoryStyled(props: {
  directory: NetworkDevice[];
  isScanning: boolean;
}) {
  return (
    <NetworkDirectory>
      {props.directory.map((dir) => (
        <DirectoryStyled
          key={dir.address}
          target={dir}
          isScanning={props.isScanning}
        />
      ))}
    </NetworkDirectory>
  );
}

const Dialog = styled.div`
  position: absolute;
  width: 100vw;
  height: 100vh;

  .back {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
  }

  .front {
    border-radius: 5px;
    font-weight: bold;
    color: #345971;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 30px;
    background-color: #cad9e7;
  }
`;

const FileInfo = styled(DialogContent)`
  .file-list {
    display: flex;
    flex-direction: column;
  }
`;

const Button = styled.div<{ type?: string; disable?: boolean }>`
  padding: 5px 10px;
  color: white;
  border-radius: 5px;

  &:hover {
    cursor: ${({ disable }) => (disable ? "not-allowed" : "pointer")};
    filter: grayscale(0.5);
  }

  background-color: ${({ type, disable }) => {
    if (disable) return "grey";
    switch (type) {
      case "decline":
        return "#242424";
      case "accept":
        return "#73b079";
      default:
        return "#345971";
    }
  }};
`;

interface FilesHeader {
  From: string;
  Files: Files[];
}

const FileSelector = styled.div`
  font-weight: normal;
  width: 100%;
  font-size: 14px;
  display: flex;

  .placeholder {
    padding: 5px 10px;
    background-color: white;
    color: #345971;
    flex: 1;
  }

  .thumb {
    padding: 5px 10px;
    background-color: #8c97b4;
    color: white;
    text-align: center;
    justify-self: flex-end;
  }

  &:hover {
    cursor: pointer;
    opacity: 0.9;
  }
`;

function FileInfoStyled(props: {
  answer: (yes: boolean, dir?: string) => void;
  files: FilesHeader;
}) {
  const [directory, setDirectory] = useState<string>("");

  const selectDirectory = async () => {
    const dir = await window.electron.selectDirectory();

    setDirectory(dir || directory);
  };

  return (
    <FileInfo>
      <Row>
        <span className="title">File incoming</span>
      </Row>
      <Row>
        <span className="hint">from {props.files.From}</span>
      </Row>
      <Row>
        <FileListStyled removable={false} files={props.files.Files} />
      </Row>
      <Row>
        <FileSelector onClick={selectDirectory}>
          <div className="placeholder">
            {directory || "Choose destination directory"}
          </div>
          <div className="thumb">...</div>
        </FileSelector>
      </Row>
      <Row justifyContent="space-between">
        <Button onClick={() => props.answer(false)} type="decline">
          Decline
        </Button>
        <Button
          disable={!directory}
          onClick={directory ? () => props.answer(true, directory) : null}
          type="accept"
        >
          Accept
        </Button>
      </Row>
    </FileInfo>
  );
}

const Error = styled(DialogContent)`
  align-items: center;
`;

function ErrorStyled(props: { error: { Title: string; Data: any } }) {
  return (
    <Error>
      <big>Unexpected error</big>
      <span>Code name: {props.error.Title}</span>
      <Button onClick={window.electron.restart}>Restart</Button>
    </Error>
  );
}

function DialogStyled({ children }: { children: JSX.Element }) {
  if (!children) return null;

  return (
    <Dialog>
      <div className="back"></div>
      <div className="front">{children}</div>
    </Dialog>
  );
}

const Row = styled.div<{
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
}>`
  display: flex;
  justify-content: ${(props) => props.justifyContent || "flex-start"};
  align-items: ${(props) => props.alignItems || "flex-start"};
  gap: ${(props) => (props.gap || 0) + "px"};
`;

const FileList = styled.div<{ removable: boolean }>`
  width: 100%;
  min-width: 400px;
  max-height: 200px;
  overflow: auto;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background-color: #345971;
  }

  .files {
    border-bottom: 1px solid #345971;
    padding: 10px 5px;
    margin: 0px 5px;
    display: flex;
    justify-content: space-between;

    .right {
      display: flex;
      gap: 10px;

      .remove {
        color: #d0756f;
        display: ${({ removable: removeable }) =>
          removeable ? "block" : "none"};

        &:hover {
          cursor: pointer;
          text-decoration: underline;
        }
      }
    }
  }
`;

const SelectFile = styled(DialogContent)`
  .hint {
    font-size: 14px;
    font-weight: normal;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    min-width: 400px;
    text-align: right;
  }
`;

function FileListStyled(props: {
  removable: boolean;
  files: Files[];
  setFiles?: Dispatch<React.SetStateAction<Files[]>>;
}) {
  const removeFromList = (removeIndex: number) => {
    const newFiles = props.files.filter((_, index) => index !== removeIndex);

    props.setFiles(newFiles);
  };

  const nameSlicer = (name: string): string => {
    return name.length > 25 ? name.slice(0, 25) + "..." : name;
  };

  return (
    <FileList removable={props.removable}>
      {props.files.length > 0 ? (
        props.files.map((file, index) => {
          return (
            <div className="files" key={file.Filename}>
              <span>{nameSlicer(file.Filename)}</span>
              <span className="right">
                <span>{file.Size} kb</span>
                <span onClick={() => removeFromList(index)} className="remove">
                  X
                </span>
              </span>
            </div>
          );
        })
      ) : (
        <span>No files selected</span>
      )}
    </FileList>
  );
}

function removeDuplicated<T>(arr: T[]): T[] {
  return arr;
}

function SelectFileStyled(props: {
  from: string;
  destination: { name: string; address: string };
}) {
  const [files, setFiles] = useState<Files[]>([]);
  const ctx = useContext(CTX);

  const addFiles = async () => {
    const newFiles = removeDuplicated([
      ...files,
      ...(await window.electron.selectFiles(props.destination.address)),
    ]);

    //Filter duplicated file
    let arrHolder: string[] = [];
    let filteredFiles: Files[] = [];
    for (let i = newFiles.length - 1; i >= 0; i--) {
      if (!arrHolder.some((name) => name === newFiles[i].Filename)) {
        arrHolder = [...arrHolder, newFiles[i].Filename];
        filteredFiles = [newFiles[i], ...filteredFiles];
      }
    }

    setFiles(filteredFiles);
  };

  const sendFiles = () => {
    ctx.setDialog(
      <Status>
        <span className="title">
          Transfering
          <LoadingDot />
        </span>
      </Status>
    );

    //For development
    if (DEV) {
      setTimeout(
        () => window.electron.fire.sendFile(files, props.destination.address),
        1000
      );
    } else {
      window.electron.fire.sendFile(files, props.destination.address);
    }
  };

  return (
    <SelectFile>
      <Row className="title">Select files</Row>
      <Row>
        <FileListStyled removable={true} files={files} setFiles={setFiles} />
      </Row>
      <Row justifyContent="space-between">
        <Row style={{ gap: 10 }}>
          <Button onClick={addFiles}>Add</Button>
          <Button type="decline" onClick={() => ctx.setDialog(null)}>
            Cancel
          </Button>
        </Row>
        <Button
          disable={files.length <= 0}
          onClick={files.length > 0 ? sendFiles : null}
          type="accept"
        >
          Send
        </Button>
      </Row>
      <Row justifyContent="flex-end">
        <span className="hint">
          Destination {props.destination.name} ({props.destination.address})
        </span>
      </Row>
    </SelectFile>
  );
}

const ThumbOnAnimation = keyframes`
  from {
    transform: translateX(-68px);
    background-color: #B07373;
  }

  to {
    transform: translateX(0);
    background-color: #73b079;
  }
`;

const ThumbOffAnimation = keyframes`
  from {
    transform: translateX(68px);
    background-color: #73b079;
  }

  to {
    transform: translateX(0);
    background-color: #B07373;
  }
`;

const Slider = styled.div<{ on: number }>`
  background-color: #345971;
  color: #84acce;
  width: 100px;
  display: flex;
  justify-content: space-between;
  flex-direction: ${(props) => (props.on ? "row" : "row-reverse")};
  align-items: center;
  border-radius: 5px;

  &:hover {
    cursor: pointer;
  }

  .pad {
    width: calc(100% - 32px);
    text-align: center;
    font-size: 14px;
  }

  .thumb.on {
    animation: ${ThumbOnAnimation} 0.2s;
  }

  .thumb.off {
    animation: ${ThumbOffAnimation} 0.2s;
  }

  .thumb {
    flex: 1fr;
    border-radius: 5px;
    height: 32px;
    width: 32px;
    background-color: ${(props) => (props.on ? "#73b079" : "#B07373")};
  }
`;

function App() {
  const [directory, setDirectory] = useState<NetworkDevice[]>([]);
  const [dialog, setDialog] = useState<JSX.Element>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [setting, setSetting] = useSetting();

  function setName(name: string) {
    const newSetting = { ...setting };
    newSetting.name = name;

    setSetting(newSetting);
  }

  function rescan() {
    setDirectory([]);
    setIsScanning(true);
    window.electron.fire.scan();
    window.electron.fire.onFinishedScan(() => {
      setIsScanning(false);
    });
  }

  useEffect(() => {
    const relay = window.electron.relay;
    const fire = window.electron.fire;

    const cancel = relay.onAction(
      "ACCEPT_FILE",
      (data: { Title: string; Data: FilesHeader }) => {
        const answer = (yes: boolean, dir?: string) => {
          if (yes) {
            setDialog(
              <Status>
                <span className="title">
                  Writing files
                  <LoadingDot />
                </span>
              </Status>
            );
            if (DEV) {
              setTimeout(() => relay.acceptFiles(dir), 1000);
            } else {
              relay.acceptFiles(dir);
            }
          } else {
            relay.writeOut("n\n");
            setDialog(null);
          }
        };

        setDialog(<FileInfoStyled answer={answer} files={data.Data} />);
      }
    );

    const cancel2 = fire.onFoundAddress(async (address: string) => {
      const { port } = await window.electron.getVariable();
      let name = await (await fetch(`http://${address}:${port}/name`)).text();

      setDirectory([...directory, { address: address, name }]);
    });

    const cancel3 = window.electron.onError((data: any) => {
      setDialog(<ErrorStyled error={data} />);
    });

    const cancel4 = window.electron.onStatus((data: DecodedData) => {
      setDialog(
        <Status>
          <span className="title">{data}</span>
          <Button onClick={() => setDialog(null)}>OK</Button>
        </Status>
      );
    });

    return () => {
      cancel();
      cancel2();
      cancel3();
      cancel4();
    };
  }, [directory]);

  if (!setting) return null;

  return (
    <CTX.Provider value={{ setDialog, name: setting.name }}>
      <DialogStyled>{dialog}</DialogStyled>
      <Titlebar>
        <span>Rain Drop</span>
        <span className="button" onClick={window.electron.close}>
          X
        </span>
      </Titlebar>
      <HeaderStyled
        isScanning={isScanning}
        setName={setName}
        rescan={rescan}
        setDirectory={setDirectory}
      />
      <NetworkDirectoryStyled isScanning={isScanning} directory={directory} />
    </CTX.Provider>
  );
}

const Titlebar = styled.div`
  padding: 5px 10px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  background-color: #345971;
  color: white;
  -webkit-app-region: drag;

  .button {
    -webkit-app-region: no-drag;
  }

  .button:hover {
    cursor: pointer;
    color: #aaa;
  }
`;

function render() {
  ReactDOM.render(<App />, document.querySelector("#app"));
}

render();
