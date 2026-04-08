'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GitCompareArrows } from 'lucide-react';
import { useScenarioStore } from '@/stores/scenario.store';
import { useCalculatorStore } from '@/stores/calculator.store';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import { toast } from 'sonner';

interface ScenarioManagerProps {
  onCompare: () => void;
}

export function ScenarioManager({ onCompare }: ScenarioManagerProps) {
  const { input } = useCalculatorStore();
  const { scenarios, addScenario, removeScenario, setCompare, canAddScenario } =
    useScenarioStore();
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    const name = newName.trim() || `Scenario ${scenarios.length + 1}`;
    const success = addScenario(name, input);
    if (success) {
      setNewName('');
      setIsAdding(false);
      toast.success(`"${name}" saved`);
    } else {
      toast.error('Maximum 2 scenarios (free tier)');
    }
  };

  const handleCompare = () => {
    if (scenarios.length < 2) {
      toast.error('Save 2 scenarios to compare');
      return;
    }
    setCompare([scenarios[0].id, scenarios[1].id]);
    onCompare();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Scenarios</h3>
        <span className="text-xs text-muted-foreground">{scenarios.length}/2</span>
      </div>

      {scenarios.map((scenario) => (
        <Card key={scenario.id} className="shadow-sm">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{scenario.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeScenario(scenario.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 text-xs text-muted-foreground">
              <span>Age: {scenario.input.currentAge}</span>
              <span>Income: {formatCurrency(scenario.input.annualIncome)}</span>
              <span>Save: {formatPercent(scenario.input.savingsRate)}</span>
              <span>Return: {formatPercent(scenario.input.expectedReturn)}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {isAdding ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name"
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <Button size="sm" className="h-8 shrink-0" onClick={handleAdd}>
            Save
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsAdding(true)}
          disabled={!canAddScenario()}
        >
          <Plus className="h-3 w-3 mr-1" />
          Save Current as Scenario
        </Button>
      )}

      {scenarios.length >= 2 && (
        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={handleCompare}
        >
          <GitCompareArrows className="h-3 w-3 mr-1" />
          Compare Scenarios
        </Button>
      )}
    </div>
  );
}
