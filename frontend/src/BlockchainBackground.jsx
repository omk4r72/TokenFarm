import React, { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

const BlockchainBackground = () => {
  const particlesInit = useCallback(async (engine) => {
    // loadFull provides the full bundle (shapes, interactions)
    await loadFull(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        background: { color: "#0b0d12" },
        fpsLimit: 60,
        interactivity: {
          detectsOn: "canvas",
          events: {
            onHover: { enable: true, mode: "connect" },
            resize: true,
          },
        },
        particles: {
          number: { value: 70, density: { enable: true, area: 900 } },
          color: { value: "#00e6ff" },
          shape: { type: "circle" },
          opacity: { value: 0.22 },
          size: { value: { min: 1, max: 3 } },
          links: { enable: true, distance: 120, color: "#00e6ff", opacity: 0.16, width: 1 },
          move: { enable: true, speed: 1.4, direction: "none", random: true, straight: false, outModes: "out" },
        },
        detectRetina: true,
      }}
    />
  );
};

export default BlockchainBackground;
