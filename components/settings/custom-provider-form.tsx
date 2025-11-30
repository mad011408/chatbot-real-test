"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomProvidersStore } from "@/lib/store/custom-providers-store";
import { CustomProvider } from "@/types/custom-provider";
import { X } from "lucide-react";

interface CustomProviderFormProps {
  provider?: CustomProvider;
  onClose?: () => void;
}

export function CustomProviderForm({ provider, onClose }: CustomProviderFormProps) {
  const { addProvider, updateProvider } = useCustomProvidersStore();
  const [name, setName] = useState(provider?.name || "");
  const [apiKey, setApiKey] = useState(provider?.apiKey || "");
  const [baseURL, setBaseURL] = useState(provider?.baseURL || "");
  const [modelsText, setModelsText] = useState(provider?.models.join("\n") || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const models = modelsText.split("\n").filter((m) => m.trim());

    if (provider) {
      updateProvider(provider.id, {
        name,
        apiKey,
        baseURL,
        models,
      });
    } else {
      addProvider({
        name,
        apiKey,
        baseURL,
        models,
      });
    }
    onClose?.();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{provider ? "Edit" : "Add"} Custom Provider</CardTitle>
            <CardDescription>
              Add your own API provider with custom models
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Provider Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Custom API"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseURL">Base URL</Label>
            <Input
              id="baseURL"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="models">Models (one per line)</Label>
            <Textarea
              id="models"
              value={modelsText}
              onChange={(e) => setModelsText(e.target.value)}
              placeholder="model-1&#10;model-2&#10;model-3"
              className="min-h-[100px] font-mono text-sm"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">{provider ? "Update" : "Add"} Provider</Button>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


