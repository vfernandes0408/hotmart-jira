import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function OpenAIConfig() {
  const [apiKey, setApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('A chave da API não pode estar vazia');
      return;
    }

    localStorage.setItem('openai_api_key', apiKey);
    setIsEditing(false);
    toast.success('Chave da API configurada com sucesso');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleClear = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setIsEditing(false);
    toast.success('Chave da API removida');
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Digite sua chave da API OpenAI"
          className="max-w-xs"
        />
        <Button onClick={handleSave} variant="default">
          Salvar
        </Button>
        <Button onClick={() => setIsEditing(false)} variant="outline">
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {apiKey ? 'Chave da API configurada' : 'Chave da API não configurada'}
      </span>
      <Button onClick={handleEdit} variant="outline" size="sm">
        {apiKey ? 'Alterar' : 'Configurar'}
      </Button>
      {apiKey && (
        <Button onClick={handleClear} variant="outline" size="sm">
          Remover
        </Button>
      )}
    </div>
  );
} 