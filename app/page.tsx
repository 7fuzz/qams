import Link from "next/link";
import { 
  Button, 
  Input, 
  Label, 
  Card, 
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
} from "@/components/ui";

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 dark:bg-gray-950">
      <main className="flex w-full max-w-5xl flex-col gap-12">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Component Showcase</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            From atomic elements to complex spreadsheet editors.
          </p>
          <div className="pt-4">
            <Link href="/tests">
              <Button size="lg" className="rounded-full px-8">Try Test Management System →</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-16">
          {/* Button Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Atomic Buttons</h2>
            <div className="flex flex-wrap gap-4">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </section>

          {/* Table Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Static Table</h2>
            <Card>
              <Table>
                <TableCaption>A list of your recent invoices.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.invoice}>
                      <TableCell className="font-medium">{invoice.invoice}</TableCell>
                      <TableCell>{invoice.paymentStatus}</TableCell>
                      <TableCell>{invoice.paymentMethod}</TableCell>
                      <TableCell className="text-right">{invoice.totalAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">$750.00</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Card>
          </section>

          {/* Form Elements Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">Form Elements</h2>
            <Card className="p-6">
              <div className="grid max-w-sm gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="m@example.com" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Accept terms and conditions</Label>
                </div>
                <Button className="w-fit">Submit Request</Button>
              </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
