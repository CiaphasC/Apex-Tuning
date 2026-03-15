export type CameraVector = [number, number, number];

export type ShowcaseIcon = () => React.JSX.Element;

export type ShowcaseView = {
  id: "dyno" | "suspension" | "turbo";
  title: string;
  subtitle: string;
  description: string;
  icon: ShowcaseIcon;
  tags: string[];
  camera: {
    position: CameraVector;
    target: CameraVector;
  };
};

