import ReactDOM from "react-dom/client";
import AppRouter from "@/app/router";
import Providers from "@/app/providers";
import "./index.css";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Providers>
    <AppRouter />
  </Providers>,
);
