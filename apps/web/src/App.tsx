import { Navigate, Route, Routes } from "react-router";
import { Convite } from "./paginas/Convite";
import { EditorAvatar } from "./paginas/EditorAvatar";
import { Entrar } from "./paginas/Entrar";
import { Espaco } from "./paginas/Espaco";
import { Inicio } from "./paginas/Inicio";
import { Galeria } from "./paginas/Galeria";
import { Protegido, SessaoProvider } from "./sessao";

export function App() {
  return (
    <SessaoProvider>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/avatar" element={<Protegido exigirAvatar={false}><EditorAvatar /></Protegido>} />
        <Route path="/" element={<Protegido><Inicio /></Protegido>} />
        <Route path="/convite/:codigo" element={<Protegido><Convite /></Protegido>} />
        <Route path="/e/:espacoId" element={<Protegido><Espaco /></Protegido>} />
        {import.meta.env.DEV && <Route path="/dev/avatares" element={<Galeria />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessaoProvider>
  );
}
