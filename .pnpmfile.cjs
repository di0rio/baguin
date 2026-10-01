// O Tailwind traz o jiti, e o pnpm passaria a resolvê-lo como peer opcional do vite. Isso muda a identidade
// do vite no grafo e o Colyseus (que depende dele) acaba com duas cópias do @colyseus/core, o que quebra o
// matchmaking ("seat reservation expired"). Sem o jiti como peer, o grafo do servidor fica idêntico.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "vite") {
        delete pkg.peerDependencies?.jiti;
        delete pkg.peerDependenciesMeta?.jiti;
      }
      return pkg;
    },
  },
};
