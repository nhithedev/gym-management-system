import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ProgressPoint {
  date: string
  weight: number | null
  bmi: number | null
}

export default function StudentProgressChart({ data }: { data: ProgressPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 8, right: 48, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis dataKey="date" stroke="#8ab89c" fontSize={11} tick={{ fill: '#8ab89c' }} />
        <YAxis
          yAxisId="weight"
          stroke="#42e09e"
          fontSize={11}
          tick={{ fill: '#42e09e' }}
          domain={[(min: number) => Math.floor(min - 2), (max: number) => Math.ceil(max + 2)]}
          width={40}
        />
        <YAxis
          yAxisId="bmi"
          orientation="right"
          stroke="#bbcabf"
          fontSize={11}
          tick={{ fill: '#bbcabf' }}
          domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: '#0f1c16',
            border: '1px solid rgba(66,224,158,0.2)',
            borderRadius: 12,
          }}
        />
        <Legend />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          name="Cân nặng"
          stroke="#42e09e"
          strokeWidth={2}
          connectNulls
        />
        <Line
          yAxisId="bmi"
          type="monotone"
          dataKey="bmi"
          name="BMI"
          stroke="#bbcabf"
          strokeWidth={2}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
