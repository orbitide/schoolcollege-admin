import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PeriodTotals } from "@/lib/institute-dashboard"

// Legacy dashboard summary: attendance and SMS for today, yesterday and the
// last 7 and 30 days.
export function AttendancePeriodTable({ periods }: { periods: PeriodTotals[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Attendance summary</CardTitle>
        <CardDescription>Student attendance records and attendance SMS sent</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">SMS sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.label}>
                <TableCell className="font-medium">{p.label}</TableCell>
                <TableCell className="text-right tabular-nums">{p.present.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{p.absent.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{p.sms.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
