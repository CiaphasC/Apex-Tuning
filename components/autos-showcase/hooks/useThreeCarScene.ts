import type { MutableRefObject, RefObject } from "react";
import { useEffect } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { FlakesTexture } from "three/examples/jsm/textures/FlakesTexture.js";
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

type RuntimeNavigator = Navigator & { deviceMemory?: number };

type RenderQualityProfile = {
  pixelRatioCap: number;
  mirrorResolutionCap: number;
  mirrorMultisample: number;
  textureAnisotropyCap: number;
  enableRealtimeShadows: boolean;
  enableStripPointLights: boolean;
};

const PUBLIC_CAR_MODEL = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r183/examples/models/gltf/ferrari.glb";
const CAR_AO_SHADOW_MAP = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r183/examples/models/gltf/ferrari_ao.png";
const HDR_ENVIRONMENT_MAP = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r183/examples/textures/equirectangular/venice_sunset_1k.hdr";
const CARBON_DIFFUSE_MAP = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r183/examples/textures/carbon/Carbon.png";
const CARBON_NORMAL_MAP = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r183/examples/textures/carbon/Carbon_Normal.png";
const FLOOR_NORMAL_MAP = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r183/examples/textures/floors/FloorsCheckerboard_S_Normal.jpg";
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/v1/decoders/";
const DRIVE_WHEEL_NAMES = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"] as const;
const WHEEL_ANGULAR_SPEED = Math.PI * 2;

const detectRenderQualityProfile = (): RenderQualityProfile => {
  if (typeof navigator === "undefined") {
    return {
      pixelRatioCap: 1.25,
      mirrorResolutionCap: 768,
      mirrorMultisample: 0,
      textureAnisotropyCap: 4,
      enableRealtimeShadows: false,
      enableStripPointLights: false,
    };
  }

  const currentNavigator = navigator as RuntimeNavigator;
  const deviceMemory = currentNavigator.deviceMemory ?? 8;
  const cpuCores = navigator.hardwareConcurrency ?? 8;

  if (deviceMemory <= 4 || cpuCores <= 4) {
    return {
      pixelRatioCap: 1,
      mirrorResolutionCap: 512,
      mirrorMultisample: 0,
      textureAnisotropyCap: 2,
      enableRealtimeShadows: false,
      enableStripPointLights: false,
    };
  }

  if (deviceMemory <= 8 || cpuCores <= 8) {
    return {
      pixelRatioCap: 1.25,
      mirrorResolutionCap: 768,
      mirrorMultisample: 0,
      textureAnisotropyCap: 4,
      enableRealtimeShadows: false,
      enableStripPointLights: false,
    };
  }

  return {
    pixelRatioCap: 1.5,
    mirrorResolutionCap: 1024,
    mirrorMultisample: 2,
    textureAnisotropyCap: 8,
    enableRealtimeShadows: false,
    enableStripPointLights: true,
  };
};

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

const DRIVE_WHEEL_GROUP_PATTERN = /^wheel_(fl|fr|rl|rr)$/i;

const isDriveWheelPart = (node: THREE.Object3D): boolean => {
  let current: THREE.Object3D | null = node;

  while (current) {
    if (DRIVE_WHEEL_GROUP_PATTERN.test(current.name)) {
      return true;
    }
    current = current.parent;
  }

  return false;
};

const configureRepeatTexture = (
  texture: THREE.Texture,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
  colorSpace?: THREE.ColorSpace,
) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = anisotropy;
  if (colorSpace) {
    texture.colorSpace = colorSpace;
  }
  texture.needsUpdate = true;
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
    const qualityProfile = detectRenderQualityProfile();

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityProfile.pixelRatioCap));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;
    renderer.shadowMap.enabled = qualityProfile.enableRealtimeShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountNode.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), qualityProfile.textureAnisotropyCap);
    const managedTextures: THREE.Texture[] = [];
    let isDisposed = false;

    const textureLoader = new THREE.TextureLoader();

    const bodyCarbonMap = textureLoader.load(CARBON_DIFFUSE_MAP);
    const bodyCarbonNormalMap = textureLoader.load(CARBON_NORMAL_MAP);
    const floorNormalMap = textureLoader.load(FLOOR_NORMAL_MAP);
    const carShadowTexture = textureLoader.load(CAR_AO_SHADOW_MAP);
    const bodyFlakesMap = new THREE.CanvasTexture(new FlakesTexture());

    managedTextures.push(bodyCarbonMap, bodyCarbonNormalMap, floorNormalMap, carShadowTexture, bodyFlakesMap);

    configureRepeatTexture(bodyCarbonMap, 16, 16, maxAnisotropy, THREE.SRGBColorSpace);
    configureRepeatTexture(bodyCarbonNormalMap, 16, 16, maxAnisotropy);
    configureRepeatTexture(bodyFlakesMap, 32, 32, maxAnisotropy);
    configureRepeatTexture(floorNormalMap, 28, 28, maxAnisotropy);
    carShadowTexture.colorSpace = THREE.SRGBColorSpace;
    carShadowTexture.anisotropy = maxAnisotropy;
    carShadowTexture.needsUpdate = true;

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
    let activeEnvironmentRenderTarget = pmremGenerator.fromScene(envScene);
    scene.environment = activeEnvironmentRenderTarget.texture;

    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      HDR_ENVIRONMENT_MAP,
      (hdrTexture) => {
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
        const hdrRenderTarget = pmremGenerator.fromEquirectangular(hdrTexture);

        if (isDisposed) {
          hdrRenderTarget.dispose();
          hdrTexture.dispose();
          return;
        }

        const previousRenderTarget = activeEnvironmentRenderTarget;
        activeEnvironmentRenderTarget = hdrRenderTarget;
        scene.environment = hdrRenderTarget.texture;
        previousRenderTarget.dispose();
        hdrTexture.dispose();
      },
      undefined,
      () => {
        // Mantener fallback procedural si falla el HDR remoto.
      },
    );

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xe6e8ee, 2.7);
    mainLight.position.set(-5, 8, 5);
    mainLight.castShadow = qualityProfile.enableRealtimeShadows;
    if (qualityProfile.enableRealtimeShadows) {
      mainLight.shadow.mapSize.set(1024, 1024);
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 35;
      mainLight.shadow.camera.left = -10;
      mainLight.shadow.camera.right = 10;
      mainLight.shadow.camera.top = 10;
      mainLight.shadow.camera.bottom = -10;
      mainLight.shadow.bias = -0.0002;
    }
    scene.add(mainLight);

    const backRedLight = new THREE.DirectionalLight(0xff0033, 3.1);
    backRedLight.position.set(5, 4, -8);
    scene.add(backRedLight);

    const floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      normalMap: floorNormalMap,
      normalScale: new THREE.Vector2(0.055, 0.055),
      roughness: 0.12,
      metalness: 0.72,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.8,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = qualityProfile.enableRealtimeShadows;
    scene.add(floor);

    const mirrorResolution = Math.min(
      qualityProfile.mirrorResolutionCap,
      Math.floor(Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio, qualityProfile.pixelRatioCap)),
    );
    const floorMirror = new Reflector(new THREE.PlaneGeometry(100, 100), {
      // 0x808080 evita tinte del shader Overlay interno de Reflector.
      color: 0x808080,
      clipBias: 0.0015,
      textureWidth: mirrorResolution,
      textureHeight: mirrorResolution,
      multisample: qualityProfile.mirrorMultisample,
    });
    floorMirror.rotation.x = -Math.PI / 2;
    floorMirror.position.y = 0.0025;
    scene.add(floorMirror);

    const createNeon = (x: number, y: number, z: number, rotationZ: number, colorHex: number) => {
      const neonMaterial = new THREE.MeshBasicMaterial({
        color: colorHex,
      });
      const neon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 20, 8), neonMaterial);
      neon.position.set(x, y, z);
      neon.rotation.z = rotationZ;
      scene.add(neon);

      const pointLight = new THREE.PointLight(colorHex, 4.2, 14);
      pointLight.position.set(x, 1, z);
      scene.add(pointLight);
    };

    const createFloorLightStrip = (
      x: number,
      z: number,
      width: number,
      length: number,
      rotationZ: number,
      colorHex: number,
      opacity = 0.6,
    ) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity,
        }),
      );
      strip.rotation.x = -Math.PI / 2;
      strip.rotation.z = rotationZ;
      strip.position.set(x, 0.006, z);
      scene.add(strip);

      if (qualityProfile.enableStripPointLights) {
        const stripLight = new THREE.PointLight(colorHex, 0.7, 5);
        stripLight.position.set(x, 0.16, z);
        scene.add(stripLight);
      }
    };

    createNeon(-5, 5, -10, 0.5, 0xffffff);
    createNeon(5, 5, -10, -0.5, 0xff0033);
    createNeon(0, 8, -12, 0, 0xffffff);

    createFloorLightStrip(-7, -2.4, 0.18, 10, Math.PI * 0.5, 0xffffff, 0.55);
    createFloorLightStrip(7, -2.4, 0.18, 10, Math.PI * 0.5, 0xffffff, 0.55);
    createFloorLightStrip(0, -9, 0.22, 14, Math.PI * 0.04, 0xffffff, 0.6);
    createFloorLightStrip(-3.8, 3.5, 0.14, 7, Math.PI * 0.34, 0xff0033, 0.5);
    createFloorLightStrip(4.2, 3.2, 0.14, 7, -Math.PI * 0.36, 0xff0033, 0.5);

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

        const wheelSpokeMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x232830,
          metalness: 0.78,
          roughness: 0.42,
          clearcoat: 0.28,
          clearcoatRoughness: 0.34,
          envMapIntensity: 1.1,
        });
        const wheelRimMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x2b3039,
          metalness: 0.86,
          roughness: 0.36,
          clearcoat: 0.38,
          clearcoatRoughness: 0.28,
          envMapIntensity: 1.25,
        });
        const tireMaterial = new THREE.MeshStandardMaterial({
          color: 0x111316,
          metalness: 0.02,
          roughness: 0.96,
          envMapIntensity: 0.06,
        });
        const wheelNutsMaterial = new THREE.MeshStandardMaterial({
          color: 0x2c313a,
          metalness: 0.7,
          roughness: 0.52,
          envMapIntensity: 0.45,
        });
        const brakeMaterial = new THREE.MeshStandardMaterial({
          color: 0x14181e,
          metalness: 0.6,
          roughness: 0.62,
          envMapIntensity: 0.14,
        });
        const centerCapMaterial = new THREE.MeshStandardMaterial({
          color: 0xa28f27,
          metalness: 0.34,
          roughness: 0.55,
          envMapIntensity: 0.35,
        });
        const interiorMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x07080a,
          metalness: 0.05,
          roughness: 0.92,
          clearcoat: 0.04,
          clearcoatRoughness: 0.9,
          envMapIntensity: 0.08,
        });
        const seatLeatherMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x0b0d10,
          metalness: 0.04,
          roughness: 0.88,
          clearcoat: 0.12,
          clearcoatRoughness: 0.72,
          envMapIntensity: 0.1,
        });

        model.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) {
            return;
          }

          node.castShadow = qualityProfile.enableRealtimeShadows;
          node.receiveShadow = qualityProfile.enableRealtimeShadows;

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
          const isBodyPanel = meshName.includes("body") || materialName.includes("body") || materialName.includes("paint");
          const isCarbonPart = meshName.includes("carbon") || materialName.includes("carbon");
          const isInteriorPart =
            meshName.includes("interior") ||
            meshName.includes("seat") ||
            meshName.includes("leather") ||
            meshName.includes("carpet") ||
            materialName.includes("interior") ||
            materialName.includes("leather") ||
            materialName.includes("carpet");
          const isSeatLeather =
            meshName.includes("leather") ||
            materialName === "leather" ||
            materialName.includes("interior_light") ||
            materialName.includes("interior_dark");

          if (isBodyPanel && !isCarbonPart) {
            node.material = new THREE.MeshPhysicalMaterial({
              color: 0x020304,
              normalMap: bodyFlakesMap,
              normalScale: new THREE.Vector2(0.035, 0.035),
              metalness: 0.16,
              roughness: 0.11,
              clearcoat: 1,
              clearcoatRoughness: 0.03,
              envMapIntensity: 2.2,
            });
          }

          if (isCarbonPart) {
            node.material = new THREE.MeshPhysicalMaterial({
              color: 0x08090b,
              map: bodyCarbonMap,
              normalMap: bodyCarbonNormalMap,
              normalScale: new THREE.Vector2(0.15, 0.15),
              metalness: 0.65,
              roughness: 0.25,
              clearcoat: 1,
              clearcoatRoughness: 0.07,
              envMapIntensity: 2.4,
            });
          }

          if (meshName.includes("glass") || materialName.includes("glass")) {
            node.material = new THREE.MeshPhysicalMaterial({
              color: 0x030405,
              metalness: 0.82,
              roughness: 0.02,
              transparent: true,
              opacity: 0.34,
              envMapIntensity: 3.6,
            });
          }

          if (isInteriorPart) {
            node.material = interiorMaterial;
          }

          if (isSeatLeather) {
            node.material = seatLeatherMaterial;
          }

          if (isDriveWheelPart(node)) {
            if (meshName === "wheel") {
              node.material = wheelSpokeMaterial;
            }

            if (meshName.includes("rim") || meshName.startsWith("rim_")) {
              node.material = wheelRimMaterial;
            }

            if (meshName === "tire") {
              node.material = tireMaterial;
            }

            if (meshName === "nuts") {
              node.material = wheelNutsMaterial;
            }

            if (meshName === "brake") {
              node.material = brakeMaterial;
            }

            if (meshName === "centre") {
              node.material = centerCapMaterial;
            }

            if (materialName === "metal_gray") {
              node.material = wheelRimMaterial;
            }
          }

        });

        wheels.push(...getDriveWheels(model));

        const contactShadow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
          new THREE.MeshBasicMaterial({
            map: carShadowTexture,
            blending: THREE.MultiplyBlending,
            toneMapped: false,
            transparent: true,
            premultipliedAlpha: true,
          }),
        );
        contactShadow.rotation.x = -Math.PI / 2;
        contactShadow.position.y = 0.01;
        contactShadow.renderOrder = 2;
        model.add(contactShadow);

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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityProfile.pixelRatioCap));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationId);
      floorMirror.getRenderTarget().dispose();
      disposeSceneGraph(scene);
      activeEnvironmentRenderTarget.dispose();
      managedTextures.forEach((texture) => texture.dispose());
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
