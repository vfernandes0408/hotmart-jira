import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import IssueTimeline from "./components/IssueTimeline";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKeys } from "@/hooks/useApiKeys";
import { queryClient } from "@/lib/queryClient";

const AppContent = () => {
  const [iaModalOpen, setIaModalOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [selectedIa, setSelectedIa] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const { apiKeys, saveKey, isConfigured } = useApiKeys();

  const handleIaClick = (ia: string) => {
    setSelectedIa(ia);
    setApiKey(apiKeys[ia] || "");
    setIaModalOpen(true);
  };

  const handleGithubClick = () => {
    setGithubToken(apiKeys["github"] || "");
    setGithubModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index iaKeys={apiKeys} onIaClick={handleIaClick} onGithubClick={handleGithubClick} />} />
              <Route path="/issue-timeline" element={<IssueTimeline data={[]} />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ErrorBoundary>

      <Dialog open={iaModalOpen} onOpenChange={setIaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedIa === "openai" && "Configurar OpenAI API Key"}
              {selectedIa === "gemini" && "Configurar Gemini API Key"}
              {selectedIa === "hotmartjedai" && "Configurar Hotmart JedAi Key"}
            </DialogTitle>
          </DialogHeader>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedIa) {
                saveKey(selectedIa, apiKey);
                setIaModalOpen(false);
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
            <Button
              type="submit"
              disabled={!apiKey.trim()}
            >
              Salvar
            </Button>
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
            <Button
              type="submit"
              disabled={!githubToken.trim()}
            >
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
