// Type override to fix Recharts compatibility with React 19
// Recharts class components have a 3-param shouldComponentUpdate which
// doesn't match React 19's 2-param signature
declare module "recharts" {
  export const BarChart: React.ComponentType<any>;
  export const LineChart: React.ComponentType<any>;
  export const PieChart: React.ComponentType<any>;
  export const AreaChart: React.ComponentType<any>;
  export const RadarChart: React.ComponentType<any>;
  export const ResponsiveContainer: React.ComponentType<any>;
  export const CartesianGrid: React.ComponentType<any>;
  export const XAxis: React.ComponentType<any>;
  export const YAxis: React.ComponentType<any>;
  export const Tooltip: React.ComponentType<any>;
  export const Legend: React.ComponentType<any>;
  export const Bar: React.ComponentType<any>;
  export const Line: React.ComponentType<any>;
  export const Pie: React.ComponentType<any>;
  export const Cell: React.ComponentType<any>;
  export const Area: React.ComponentType<any>;
  export const Radar: React.ComponentType<any>;
  export const PolarGrid: React.ComponentType<any>;
  export const PolarAngleAxis: React.ComponentType<any>;
  export const PolarRadiusAxis: React.ComponentType<any>;
}
