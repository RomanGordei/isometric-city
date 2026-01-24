'use client';

import React, { useMemo, useState } from 'react';
import { msg, useMessages } from 'gt-next';
import { useCoaster } from '@/context/CoasterContext';
import { Tool, TOOL_INFO } from '@/games/coaster/types';
import { COASTER_CATEGORY_LABELS, COASTER_MENU_CATEGORIES, COASTER_TRACK_TOOLS, COASTER_TYPE_TOOL_MAP, COASTER_TYPE_TOOLS } from '@/components/coaster/toolUtils';
import { COASTER_TYPE_STATS, getCoasterCategory } from '@/games/coaster/types/tracks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseIcon, SelectIcon, BulldozeIcon, RoadIcon } from '@/components/ui/Icons';

const QUICK_TOOLS: Tool[] = ['select', 'bulldoze', 'path', 'queue', 'coaster_build'];

const QUICK_TOOL_ICONS: Partial<Record<Tool, React.ReactNode>> = {
  select: <SelectIcon size={20} />,
  bulldoze: <BulldozeIcon size={20} />,
  path: <RoadIcon size={20} />,
  queue: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 6h6M5 12h10M5 18h14" />
      <circle cx="17" cy="6" r="2" />
    </svg>
  ),
  coaster_build: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 18h18" />
      <path d="M5 18V8l7-4 7 4v10" />
      <path d="M9 12h6" />
    </svg>
  ),
};

const UI_LABELS = {
  parkManagement: msg('Park Management'),
  finances: msg('Finances'),
  settings: msg('Settings'),
  activeCoaster: msg('Active Coaster'),
  stopBuilding: msg('Stop'),
};

export function CoasterMobileToolbar() {
  const { state, setTool, setActivePanel, startCoasterBuild, cancelCoasterBuild } = useCoaster();
  const { selectedTool, finances, buildingCoasterType } = state;
  const [showMenu, setShowMenu] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const m = useMessages();

  const toolsByCategory = useMemo(() => {
    const grouped: Record<string, Tool[]> = {};
    (Object.entries(TOOL_INFO) as [Tool, { category: string }][]).forEach(([tool, info]) => {
      if (!grouped[info.category]) grouped[info.category] = [];
      grouped[info.category].push(tool);
    });

    if (grouped.coasters) {
      const track = grouped.coasters.filter(tool => COASTER_TRACK_TOOLS.includes(tool));
      const types = grouped.coasters.filter(tool => COASTER_TYPE_TOOLS.includes(tool));
      const rest = grouped.coasters.filter(tool => !COASTER_TRACK_TOOLS.includes(tool) && !COASTER_TYPE_TOOLS.includes(tool));
      grouped.coasters = [...track, ...types, ...rest];
    }

    return grouped;
  }, []);

  const orderedCategories = useMemo(
    () => COASTER_MENU_CATEGORIES.filter((category) => category.key !== 'panels'),
    []
  );

  const handleToolSelect = (tool: Tool, closeMenu: boolean = false) => {
    const coasterType = COASTER_TYPE_TOOL_MAP[tool];
    if (coasterType) {
      startCoasterBuild(coasterType);
      setTool('coaster_build');
    } else if (selectedTool === tool && tool !== 'select') {
      setTool('select');
    } else {
      setTool(tool);
    }

    setExpandedCategory(null);
    if (closeMenu) {
      setShowMenu(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <Card className="rounded-none border-x-0 border-b-0 bg-card/95 backdrop-blur-sm">
          {selectedTool && TOOL_INFO[selectedTool] && (
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-sidebar-border/50 bg-secondary/30 text-xs">
              <span className="text-foreground font-medium">{TOOL_INFO[selectedTool].name}</span>
              {TOOL_INFO[selectedTool].cost > 0 && (
                <span className={`font-mono ${finances.cash >= TOOL_INFO[selectedTool].cost ? 'text-green-400' : 'text-red-400'}`}>
                  ${TOOL_INFO[selectedTool].cost}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-around px-2 py-2 gap-1">
            {QUICK_TOOLS.map((tool) => (
              <Button
                key={tool}
                variant={selectedTool === tool ? 'default' : 'ghost'}
                size="icon"
                className="h-11 w-11"
                onClick={() => handleToolSelect(tool)}
              >
                {QUICK_TOOL_ICONS[tool] ?? tool}
              </Button>
            ))}

            <Button
              variant={showMenu ? 'default' : 'secondary'}
              size="icon"
              className="h-11 w-11"
              onClick={() => setShowMenu(!showMenu)}
            >
              {showMenu ? (
                <CloseIcon size={20} />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <Card
            className="absolute bottom-20 left-2 right-2 max-h-[70vh] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {m(UI_LABELS.parkManagement)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={state.activePanel === 'finances' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { setActivePanel(state.activePanel === 'finances' ? 'none' : 'finances'); setShowMenu(false); }}
                >
                  {m(UI_LABELS.finances)}
                </Button>
                <Button
                  variant={state.activePanel === 'settings' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { setActivePanel(state.activePanel === 'settings' ? 'none' : 'settings'); setShowMenu(false); }}
                >
                  {m(UI_LABELS.settings)}
                </Button>
              </div>
            </div>

            {buildingCoasterType && (
              <div className="p-3 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {m(UI_LABELS.activeCoaster)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => cancelCoasterBuild()}
                  >
                    {m(UI_LABELS.stopBuilding)}
                  </Button>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {COASTER_TYPE_STATS[buildingCoasterType]?.name ?? 'Custom Coaster'}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {getCoasterCategory(buildingCoasterType)} coaster
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-2 space-y-1 pb-4">
                {orderedCategories.map((category) => {
                  const tools = toolsByCategory[category.key] ?? [];
                  if (tools.length === 0) return null;

                  return (
                    <div key={category.key}>
                      <Button
                        variant={expandedCategory === category.key ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-3 h-12"
                        onClick={() => setExpandedCategory(expandedCategory === category.key ? null : category.key)}
                      >
                        <span className="flex-1 text-left font-medium">
                          {COASTER_CATEGORY_LABELS[category.key] || category.key}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedCategory === category.key ? 'rotate-180' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </Button>

                      {expandedCategory === category.key && (
                        <div className="pl-4 py-1 space-y-0.5">
                          {tools.map((tool) => {
                            const info = TOOL_INFO[tool];
                            if (!info) return null;
                            const canAfford = finances.cash >= info.cost;

                            return (
                              <Button
                                key={tool}
                                variant={selectedTool === tool ? 'default' : 'ghost'}
                                className="w-full justify-start gap-3 h-11"
                                disabled={!canAfford && info.cost > 0}
                                onClick={() => handleToolSelect(tool, true)}
                              >
                                <span className="flex-1 text-left">{info.name}</span>
                                {info.cost > 0 && (
                                  <span className={`text-xs font-mono ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                    ${info.cost}
                                  </span>
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default CoasterMobileToolbar;
