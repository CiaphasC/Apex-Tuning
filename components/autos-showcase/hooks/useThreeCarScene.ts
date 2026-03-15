import type { MutableRefObject, RefObject } from "react";
import { useEffect } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CameraVector } from "../types";

type UseThreeCarSceneParams = {
  mountRef: RefObject<HTMLDivElement | null>;
  initialCameraPosition: CameraVector;
  initialCameraTarget: CameraVector;
  targetCameraPositionRef: MutableRefObject<THREE.Vector3>;
  targetCameraTargetRef: MutableRefObject<THREE.Vector3>;
  onLoadingChange: (isLoading: boolean) => void;
  onModelError: (hasError: boolean) => void;
};

const PUBLIC_CAR_MODEL = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r183/examples/models/gltf/ferrari.glb";
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/v1/decoders/";
const DRIVE_WHEEL_NAMES = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"] as const;
const WHEEL_ANGULAR_SPEED = Math.PI * 2;

const getPrimaryMaterial = (material: THREE.Material | THREE.Material[]): THREE.Material =>
  Array.isArray(material) ? material[0] : material;

const disposeMeshMaterial = (material: THREE.Material | THREE.Material[]) => {
  if (Array.isArray(material)) {
    material.forEach((currentMaterial) => currentMaterial.dispose());
    return;
  }

  material.dispose();
};

const disposeSceneGraph = (root: THREE.Object3D) => {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    node.geometry.dispose();
    disposeMeshMaterial(node.material);
  });
};

const applyBrakeAccent = (material: THREE.Material) => {
  const materialWithColor = material as THREE.Material & { color?: THREE.Color; emissive?: THREE.Color };
  materialWithColor.color?.setHex(0xff0000);
  materialWithColor.emissive?.setHex(0x550000);
};

const getDriveWheels = (root: THREE.Object3D): THREE.Object3D[] => {
  const byCanonicalNames = DRIVE_WHEEL_NAMES.map((wheelName) => root.getObjectByName(wheelName)).filter(
    (wheel): wheel is THREE.Object3D => Boolean(wheel),
  );

  if (byCanonicalNames.length > 0) {
    return byCanonicalNames;
  }

  // Fallback defensivo para variantes del modelo.
  const fallback: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (/^wheel_(fl|fr|rl|rr)$/i.test(node.name)) {
      fallback.push(node);
    }
  });

  return fallback;
};

export const useThreeCarScene = ({
  mountRef,
  initialCameraPosition,
  initialCameraTarget,
  targetCameraPositionRef,
  targetCameraTargetRef,
  onLoadingChange,
  onModelError,
}: UseThreeCarSceneParams) => {
  useEffect(() => {
    const mountNode = mountRef.current;

    if (!mountNode) {
      return;
    }

    onLoadingChange(true);
    onModelError(false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030303");
    scene.fog = new THREE.FogExp2("#030303", 0.04);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(...initialCameraPosition);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountNode.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    const envLight = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      }),
    );
    envLight.position.set(0, 10, 0);
    envLight.rotation.x = Math.PI / 2;
    envScene.add(envLight);
    const envRenderTarget = pmremGenerator.fromScene(envScene);
    scene.environment = envRenderTarget.texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xe0f2fe, 4);
    mainLight.position.set(-5, 8, 5);
    scene.add(mainLight);

    const backRedLight = new THREE.DirectionalLight(0xff0033, 6);
    backRedLight.position.set(5, 4, -8);
    scene.add(backRedLight);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.02,
      metalness: 0.95,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    const createNeon = (x: number, y: number, z: number, rotationZ: number, colorHex: number) => {
      const neonMaterial = new THREE.MeshBasicMaterial({
        color: colorHex,
      });
      const neon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 20, 16), neonMaterial);
      neon.position.set(x, y, z);
      neon.rotation.z = rotationZ;
      scene.add(neon);

      const pointLight = new THREE.PointLight(colorHex, 10, 20);
      pointLight.position.set(x, 1, z);
      scene.add(pointLight);
    };

    createNeon(-5, 5, -10, 0.5, 0xffffff);
    createNeon(5, 5, -10, -0.5, 0xff0033);
    createNeon(0, 8, -12, 0, 0xffffff);

    const carGroup = new THREE.Group();
    scene.add(carGroup);

    const wheels: THREE.Object3D[] = [];
    let isModelReady = false;
    let hasModelError = false;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      PUBLIC_CAR_MODEL,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.4, 1.4, 1.4);
        model.position.set(0, 0, 0);
        model.rotation.y = Math.PI;

        model.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) {
            return;
          }

          node.castShadow = true;
          node.receiveShadow = true;

          const sourceMaterial = getPrimaryMaterial(node.material);
          sourceMaterial.needsUpdate = true;

          const sourceMaterialWithEnv = sourceMaterial as THREE.Material & {
            envMapIntensity?: number;
          };
          if (typeof sourceMaterialWithEnv.envMapIntensity === "number") {
            sourceMaterialWithEnv.envMapIntensity = 2.5;
          }

          const meshName = node.name.toLowerCase();
          const materialName = sourceMaterial.name?.toLowerCase() ?? "";

          if (meshName.includes("body") || materialName.includes("body") || materialName.includes("paint")) {
            node.material = new THREE.MeshPhysicalMaterial({
              color: 0x111111,
              metalness: 0.8,
              roughness: 0.1,
              clearcoat: 1,
              clearcoatRoughness: 0.02,
              envMapIntensity: 4,
            });
          }

          if (meshName.includes("glass") || materialName.includes("glass")) {
            node.material = new THREE.MeshPhysicalMaterial({
              color: 0x000000,
              metalness: 0.9,
              roughness: 0,
              transparent: true,
              opacity: 0.7,
              envMapIntensity: 4,
            });
          }

          if (meshName.includes("wheel") || meshName.includes("tire") || meshName.includes("rim")) {
            if (materialName.includes("rim")) {
              node.material = new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 0.9,
                roughness: 0.2,
                envMapIntensity: 2,
              });
            }
          }

          if (materialName.includes("brake")) {
            applyBrakeAccent(getPrimaryMaterial(node.material));
          }
        });

        wheels.push(...getDriveWheels(model));
        carGroup.add(model);
        isModelReady = true;
        onLoadingChange(false);
      },
      undefined,
      () => {
        hasModelError = true;
        onLoadingChange(false);
        onModelError(true);
      },
    );

    const currentLookAt = new THREE.Vector3(...initialCameraTarget);
    const clock = new THREE.Clock();
    let animationId = 0;

    const animate = () => {
      animationId = window.requestAnimationFrame(animate);
      const delta = clock.getDelta();

      camera.position.lerp(targetCameraPositionRef.current, 0.04);
      currentLookAt.lerp(targetCameraTargetRef.current, 0.05);
      camera.lookAt(currentLookAt);

      if (wheels.length > 0 && isModelReady && !hasModelError) {
        wheels.forEach((wheel) => {
          wheel.rotation.x -= WHEEL_ANGULAR_SPEED * delta;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationId);
      disposeSceneGraph(scene);
      envRenderTarget.dispose();
      pmremGenerator.dispose();
      dracoLoader.dispose();
      renderer.dispose();

      if (mountNode.contains(renderer.domElement)) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [
    initialCameraPosition,
    initialCameraTarget,
    mountRef,
    onLoadingChange,
    onModelError,
    targetCameraPositionRef,
    targetCameraTargetRef,
  ]);
};
