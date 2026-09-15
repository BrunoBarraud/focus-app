"use client";

import * as React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { WheelArea } from "@/lib/types";
import { updateWheelAreaScore } from "@/lib/api";
import { Compass, Sparkles, Activity } from "lucide-react";

interface WheelOfLifeProps {
  initialAreas: WheelArea[];
}

export function WheelOfLife({ initialAreas }: WheelOfLifeProps) {
  const [areas, setAreas] = React.useState<WheelArea[]>(initialAreas);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleScoreChange = async (subject: string, newScore: number) => {
    const updated = await updateWheelAreaScore(subject, newScore);
    setAreas(updated);
  };

  const averageScore = (
    areas.reduce((acc, curr) => acc + curr.score, 0) / (areas.length || 1)
  ).toFixed(1);

  return (
    <Card className="border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
              <Compass className="h-3.5 w-3.5" /> Balance Integral
            </div>
            <CardTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              Rueda de la Vida
            </CardTitle>
            <CardDescription>
              Evaluación holística de tus 8 pilares vitales (Escala 1 al 10)
            </CardDescription>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 flex items-center gap-2 self-start sm:self-auto">
            <Activity className="h-4 w-4 text-violet-400" />
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                Equilibrio Global
              </p>
              <p className="text-base font-bold text-white font-mono">
                {averageScore} <span className="text-xs text-zinc-400 font-normal">/ 10</span>
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
        {/* Radar Chart Container */}
        <div className="lg:col-span-7 h-[340px] sm:h-[380px] w-full flex items-center justify-center">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={areas}>
                <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  stroke="#27272a"
                />
                <Radar
                  name="Puntuación"
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.35}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload as WheelArea;
                      return (
                        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 shadow-xl text-xs">
                          <p className="font-bold text-white">{data.subject}</p>
                          <p className="text-violet-400 font-semibold mt-0.5">
                            Puntaje: {data.score} / 10
                          </p>
                          <p className="text-zinc-400 text-[10px] mt-1 max-w-[180px]">
                            {data.description}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 w-64 rounded-full border border-zinc-800 animate-pulse bg-zinc-900/40" />
          )}
        </div>

        {/* Interactive Calibrator Controls */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Calibrar Áreas
          </p>
          {areas.map((area) => (
            <div
              key={area.subject}
              className="rounded-lg p-2.5 bg-zinc-900/40 border border-zinc-800/60 hover:border-violet-500/30 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-zinc-200">{area.subject}</span>
                <span className="font-mono font-bold text-violet-400">
                  {area.score}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={area.score}
                onChange={(e) =>
                  handleScoreChange(area.subject, parseFloat(e.target.value))
                }
                className="w-full accent-violet-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
