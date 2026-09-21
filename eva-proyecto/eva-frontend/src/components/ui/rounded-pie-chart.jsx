"use client";

import { LabelList, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export function RoundedPieChart({ chartData, chartConfig, title, description, badgeText, dataKey = "value", nameKey = "name", valueFormatter = (value) => value.toString() }) {
  return (
    <Card className="flex flex-col border-none shadow-none bg-transparent">
      <CardHeader className="items-center justify-center pb-4">
        <CardTitle className="text-[#2b3437] text-xl flex items-center justify-center">
          {title}
          {badgeText && (
            <Badge
              variant="outline"
              className="text-green-500 bg-green-500/10 border-none ml-2">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{badgeText}</span>
            </Badge>
          )}
        </CardTitle>
        {description && <CardDescription className="text-[#586064] text-base mt-2">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pb-6 w-full flex flex-col items-center">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-text]:fill-[#2b3437] mx-auto w-full max-w-[450px] aspect-square min-h-[350px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              innerRadius={90}
              dataKey={dataKey}
              nameKey={nameKey}
              radius={130}
              cornerRadius={8}
              stroke="none"
              paddingAngle={5}>
              <LabelList
                dataKey={dataKey}
                position="inside"
                stroke="none"
                fontSize={18}
                fontWeight={700}
                fill="#ffffff"
                formatter={valueFormatter} />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        {chartData && chartData.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 w-full max-w-xl">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm" 
                  style={{ backgroundColor: item.fill || chartConfig[item[nameKey]]?.color }} 
                />
                <span className="text-sm font-bold text-[#586064] uppercase tracking-wider">
                  {item[nameKey] || chartConfig[item[nameKey]]?.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
