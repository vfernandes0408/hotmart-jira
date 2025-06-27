import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKeys } from "@/hooks/useApiKeys";
import { queryClient } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const AppContent = () => {
  const [iaModalOpen, setIaModalOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [selectedIa, setSelectedIa] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const { apiKeys, saveKey, removeKey, isConfigured } = useApiKeys();

  const handleIaClick = (ia: string) => {
    setSelectedIa(ia);
    setApiKey(apiKeys[ia] || "");
    setIaModalOpen(true);
  };

  const handleGithubClick = () => {
    setGithubToken(apiKeys["github"] || "");
    setGithubModalOpen(true);
  };

  const handleRemoveKey = (key: string) => {
    removeKey(key);
    if (key === "github") {
      setGithubModalOpen(false);
      setGithubToken("");
      toast.success("Token do GitHub removido com sucesso!");
    } else {
      setIaModalOpen(false);
      setApiKey("");
      toast.success("Token da OpenAI removido com sucesso!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        <Toaster />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index iaKeys={apiKeys} onIaClick={handleIaClick} onGithubClick={handleGithubClick} />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>

        <Dialog open={iaModalOpen} onOpenChange={setIaModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedIa === "openai" && "Configurar OpenAI API Key"}
              </DialogTitle>
              <DialogDescription>
                {selectedIa === "openai" && "Configure sua chave de API da OpenAI para usar a funcionalidade de análise de dados."}
              </DialogDescription>
            </DialogHeader>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedIa) {
                  saveKey(selectedIa, apiKey);
                  setIaModalOpen(false);
                  toast.success(`Token ${selectedIa === "openai" ? "da OpenAI" : "do Gemini"} salvo com sucesso!`);
                }
              }}
              className="space-y-4"
            >
              <Label className="text-sm font-medium">API Key</Label>
              <Input
                type="password"
                placeholder="Digite a chave"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <DialogFooter className="flex justify-between items-center gap-2">
                {selectedIa && isConfigured(selectedIa) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveKey(selectedIa)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIaModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={!apiKey.trim()}
                  >
                    Salvar
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={githubModalOpen} onOpenChange={setGithubModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar GitHub Token</DialogTitle>
            </DialogHeader>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                saveKey("github", githubToken);
                setGithubModalOpen(false);
                toast.success("Token do GitHub salvo com sucesso!");
              }}
              className="space-y-4"
            >
              <Label className="text-sm font-medium">Token</Label>
              <Input
                type="password"
                placeholder="Digite o token"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
              />
              <DialogFooter className="flex justify-between items-center gap-2">
                {isConfigured("github") && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveKey("github")}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGithubModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={!githubToken.trim()}
                  >
                    Salvar
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </ErrorBoundary>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
