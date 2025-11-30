"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLMModel } from "@/lib/models/llm-list";

interface ExtendedLLMModel extends Omit<LLMModel, 'provider'> {
  provider?: string;
}

interface ModelSelectProps {
  models: ExtendedLLMModel[];
  value: string;
  onValueChange: (value: string) => void;
}

export function ModelSelect({ models, value, onValueChange }: ModelSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

