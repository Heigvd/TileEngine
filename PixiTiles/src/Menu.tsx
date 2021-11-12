import { css } from "@emotion/css";
import * as React from "react";

const menuStyle: React.CSSProperties = {
  position: "absolute",
  display: "flex",
  flexDirection: "column",
  maxHeight: "300px",
  backgroundColor: "white",
  overflow: "auto",
  paddingRight: "15px",
};

const defaultMenuItemStyle = css({
  cursor: "pointer",
  ":hover": {
    backgroundColor: "lightgrey",
  },
});

function DefaultMenuItem({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  position: { x: number; y: number };
}): JSX.Element {
  return (
    <div className={defaultMenuItemStyle} {...props}>
      {children}
    </div>
  );
}

interface MenuContext {
  showMenu: (
    position: { x: number; y: number },
    cb: (
      event: React.MouseEvent<HTMLDivElement, MouseEvent>,
      itemId: string
    ) => void
  ) => void;
  hideMenu: () => void;
}

export const menuCTX = React.createContext<MenuContext>({
  showMenu: () => {},
  hideMenu: () => {},
});

interface MenuState {
  show: boolean;
  position: { x: number; y: number };
  cb: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    itemId: string
  ) => void;
}

const defaultMenuState: MenuState = {
  show: false,
  position: { x: 0, y: 0 },
  cb: () => {},
};

interface MenuItem<T> {
  id: string;
  label: React.ReactNode;
  value: T;
}

interface MenuProps<T> {
  items: MenuItem<T>[];
  MenuItem?: React.FunctionComponent<React.HTMLAttributes<HTMLDivElement>>;
}

export function MenuProvider<T>({
  items,
  MenuItem = DefaultMenuItem,
  children,
}: React.PropsWithChildren<MenuProps<T>>): JSX.Element {
  const [{ show, position, cb }, setMenuValues] =
    React.useState(defaultMenuState);

  return (
    <menuCTX.Provider
      value={{
        showMenu: (position, cb) => setMenuValues({ show: true, position, cb }),
        hideMenu: () => setMenuValues(defaultMenuState),
      }}
    >
      {children}
      {show && (
        <div style={{ ...menuStyle, left: position.x, top: position.y }}>
          {items.map((item) => (
            <MenuItem key={item.id} onClick={(e) => cb(e, item.id)}>
              {item.label}
            </MenuItem>
          ))}
        </div>
      )}
    </menuCTX.Provider>
  );
}
