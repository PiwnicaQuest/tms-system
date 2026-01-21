"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  Users,
  Truck,
  Plus,
  Download,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";

// Mock data - will be replaced with real data from API
const driverMonthlyData = [
  {
    id: "1",
    driver: "Adam Dobkowski",
    workDays: 22,
    totalRevenue: 41832.42,
    avgDaily: 1901.47,
    orders: 28,
  },
  {
    id: "2",
    driver: "Michał Kowalski",
    workDays: 20,
    totalRevenue: 38450.00,
    avgDaily: 1922.50,
    orders: 25,
  },
  {
    id: "3",
    driver: "Piotr Zaroślinski",
    workDays: 21,
    totalRevenue: 35200.00,
    avgDaily: 1676.19,
    orders: 24,
  },
  {
    id: "4",
    driver: "Jan Wiśniewski",
    workDays: 19,
    totalRevenue: 32100.00,
    avgDaily: 1689.47,
    orders: 22,
  },
];

const vehicleMonthlyData = [
  {
    id: "1",
    vehicle: "WGM1068L",
    operatingDays: 24,
    revenue: 52400.00,
    fuelCost: 8500.00,
    otherCost: 2200.00,
    profit: 41700.00,
    margin: 79.6,
    driversCount: 2,
  },
  {
    id: "2",
    vehicle: "DSR50038",
    operatingDays: 22,
    revenue: 45200.00,
    fuelCost: 7800.00,
    otherCost: 1800.00,
    profit: 35600.00,
    margin: 78.8,
    driversCount: 3,
  },
  {
    id: "3",
    vehicle: "PZ057XE",
    operatingDays: 20,
    revenue: 38900.00,
    fuelCost: 6900.00,
    otherCost: 1500.00,
    profit: 30500.00,
    margin: 78.4,
    driversCount: 2,
  },
];

const dailyRecords = [
  {
    id: "1",
    date: "2026-01-15",
    driver: "Adam Dobkowski",
    vehicle: "WGM1068L",
    route: "Jarosty - Bydgoszcz ; Bydgoszcz - Łódź",
    client: "RHENUS / MIO",
    amount: 2185.00,
    share: 100,
  },
  {
    id: "2",
    date: "2026-01-14",
    driver: "Adam Dobkowski",
    vehicle: "WGM1068L",
    route: "Jarosty - Bydgoszcz ; Bydgoszcz - Łódź",
    client: "RHENUS / ICEL",
    amount: 2185.00,
    share: 100,
  },
  {
    id: "3",
    date: "2026-01-13",
    driver: "Adam Dobkowski",
    vehicle: "WGM1068L",
    route: "Jarosty - Wrocław (pół trasy)",
    client: "RHENUS",
    amount: 535.00,
    share: 50,
    note: "Reszta u Michała",
  },
  {
    id: "4",
    date: "2026-01-13",
    driver: "Michał Kowalski",
    vehicle: "PZ057XE",
    route: "Łagiewniki - Wrocław (dokończenie)",
    client: "RHENUS",
    amount: 535.00,
    share: 50,
    note: "Dociągnięcie od Adama",
  },
];

export default function CostsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    driver: "",
    vehicle: "",
    route: "",
    client: "",
    amount: "",
    share: "100",
    note: "",
  });

  // Export to Excel/CSV
  const handleExportExcel = () => {
    const headers = ["Data", "Kierowca", "Pojazd", "Trasa", "Klient", "Udzial", "Kwota"];
    const csvContent = [
      headers.join(";"),
      ...dailyRecords.map((record) =>
        [
          record.date,
          record.driver,
          record.vehicle,
          record.route,
          record.client,
          `${record.share}%`,
          `${record.amount.toFixed(2).replace(".", ",")} zl`,
        ].join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rozliczenia-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle form input change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // TODO: Implement API call when backend is ready
      // For now, just close the dialog
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert("Funkcja dodawania wpisow bedzie dostepna po podlaczeniu do bazy danych");
      setShowAddDialog(false);
      setFormData({
        date: "",
        driver: "",
        vehicle: "",
        route: "",
        client: "",
        amount: "",
        share: "100",
        note: "",
      });
    } catch (error) {
      console.error("Error adding entry:", error);
      alert("Wystapil blad podczas dodawania wpisu");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Rozliczenia Kosztów
          </h1>
          <p className="text-muted-foreground">
            Alokacja przychodów na kierowców i pojazdy
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            Eksport Excel
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj wpis
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Okres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Styczeń 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Suma przychodów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">287 450 zł</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Aktywni kierowcy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">18</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Pojazdy w eksploatacji
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">24</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Dzienne wpisy</TabsTrigger>
          <TabsTrigger value="drivers">Raport kierowców</TabsTrigger>
          <TabsTrigger value="vehicles">Raport pojazdów</TabsTrigger>
        </TabsList>

        {/* Daily Records Tab */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Dzienne rekordy pracy</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Kierowca</TableHead>
                    <TableHead>Pojazd</TableHead>
                    <TableHead>Trasa</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Udział</TableHead>
                    <TableHead className="text-right">Kwota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.date}
                      </TableCell>
                      <TableCell>{record.driver}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.vehicle}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.route}
                        {record.note && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({record.note})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{record.client}</TableCell>
                      <TableCell>
                        {record.share < 100 ? (
                          <Badge variant="secondary">{record.share}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">100%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {record.amount.toLocaleString("pl-PL")} zł
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drivers Report Tab */}
        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Raport miesięczny kierowców
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kierowca</TableHead>
                    <TableHead className="text-center">Dni pracy</TableHead>
                    <TableHead className="text-center">Zleceń</TableHead>
                    <TableHead className="text-right">Średnia/dzień</TableHead>
                    <TableHead className="text-right">Suma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverMonthlyData.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.driver}
                      </TableCell>
                      <TableCell className="text-center">
                        {driver.workDays}
                      </TableCell>
                      <TableCell className="text-center">
                        {driver.orders}
                      </TableCell>
                      <TableCell className="text-right">
                        {driver.avgDaily.toLocaleString("pl-PL")} zł
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {driver.totalRevenue.toLocaleString("pl-PL")} zł
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Report Tab */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Raport miesięczny pojazdów (rentowność)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pojazd</TableHead>
                    <TableHead className="text-center">Dni</TableHead>
                    <TableHead className="text-center">Kierowcy</TableHead>
                    <TableHead className="text-right">Przychód</TableHead>
                    <TableHead className="text-right">Paliwo</TableHead>
                    <TableHead className="text-right">Inne koszty</TableHead>
                    <TableHead className="text-right">Zysk</TableHead>
                    <TableHead className="text-right">Marża</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleMonthlyData.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {vehicle.vehicle}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {vehicle.operatingDays}
                      </TableCell>
                      <TableCell className="text-center">
                        {vehicle.driversCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {vehicle.revenue.toLocaleString("pl-PL")} zł
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{vehicle.fuelCost.toLocaleString("pl-PL")} zł
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{vehicle.otherCost.toLocaleString("pl-PL")} zł
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {vehicle.profit.toLocaleString("pl-PL")} zł
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={vehicle.margin >= 75 ? "default" : "secondary"}
                          className={
                            vehicle.margin >= 75
                              ? "bg-green-600"
                              : vehicle.margin >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }
                        >
                          {vehicle.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dodaj wpis rozliczenia</DialogTitle>
            <DialogDescription>
              Wprowadz dane nowego wpisu rozliczeniowego
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver">Kierowca</Label>
                <Select
                  value={formData.driver}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, driver: value }))
                  }
                >
                  <SelectTrigger id="driver">
                    <SelectValue placeholder="Wybierz kierowce" />
                  </SelectTrigger>
                  <SelectContent>
                    {driverMonthlyData.map((d) => (
                      <SelectItem key={d.id} value={d.driver}>
                        {d.driver}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle">Pojazd</Label>
                <Select
                  value={formData.vehicle}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, vehicle: value }))
                  }
                >
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Wybierz pojazd" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleMonthlyData.map((v) => (
                      <SelectItem key={v.id} value={v.vehicle}>
                        {v.vehicle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Kwota (zl)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="route">Trasa</Label>
              <Input
                id="route"
                name="route"
                value={formData.route}
                onChange={handleFormChange}
                placeholder="np. Warszawa - Krakow"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client">Klient</Label>
                <Input
                  id="client"
                  name="client"
                  value={formData.client}
                  onChange={handleFormChange}
                  placeholder="Nazwa klienta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share">Udzial (%)</Label>
                <Input
                  id="share"
                  name="share"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.share}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Uwagi</Label>
              <Input
                id="note"
                name="note"
                value={formData.note}
                onChange={handleFormChange}
                placeholder="Opcjonalne uwagi"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Dodaj wpis
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
