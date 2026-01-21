# Bakus TMS - Schemat Bazy Danych

## Główne modele

### Tenant (Multi-tenancy)
- id, name, slug, isActive
- Relacje: users, vehicles, drivers, trailers, orders, invoices, contractors, documents, costs, settings

### User (Użytkownicy)
- id, email, password, firstName, lastName, role (ADMIN/DISPATCHER/ACCOUNTANT/DRIVER), isActive, tenantId

### Vehicle (Pojazdy)
- id, registrationNumber, vin, brand, model, year
- type: TRUCK, VAN, SEMI_TRUCK, TRAILER
- status: AVAILABLE, IN_USE, MAINTENANCE, OUT_OF_SERVICE
- fuelType, tankCapacity, avgFuelConsumption, currentMileage
- insuranceExpiry, technicalExpiry, tachographExpiry

### Driver (Kierowcy)
- id, firstName, lastName, email, phone, pesel
- licenseNumber, licenseExpiry, medicalExpiry, adExpiry
- employmentDate, contractType, hourlyRate, monthlyRate
- status: AVAILABLE, ON_ROUTE, ON_BREAK, ON_LEAVE, UNAVAILABLE

### Trailer (Naczepy)
- id, registrationNumber, brand, model, year
- type: CURTAIN_SIDE, REFRIGERATED, TANK, FLATBED, CONTAINER, MEGA, STANDARD
- capacity (tony), volume (m3)
- status: AVAILABLE, IN_USE, MAINTENANCE, OUT_OF_SERVICE

### Order (Zlecenia)
- id, orderNumber, externalNumber
- type: OWN, FORWARDING
- status: PLANNED, ASSIGNED, CONFIRMED, LOADING, IN_TRANSIT, UNLOADING, COMPLETED, CANCELLED, PROBLEM
- origin, originCity, originCountry, destination, destinationCity, destinationCountry, distance
- loadingDate, unloadingDate
- cargoType, cargoWeight, cargoVolume, cargoDescription
- priceNet, currency, costNet, margin
- contractorId, driverId, vehicleId, trailerId

### Invoice (Faktury)
- id, invoiceNumber
- type: SINGLE, COLLECTIVE, PROFORMA, CORRECTION
- status: DRAFT, ISSUED, SENT, PAID, OVERDUE, CANCELLED
- issueDate, saleDate, dueDate
- netAmount, vatRate, vatAmount, grossAmount, currency
- paymentMethod: TRANSFER, CASH, CARD

### Contractor (Kontrahenci)
- id, name, shortName, nip, regon
- type: CLIENT, CARRIER, BOTH
- address, city, postalCode, country
- phone, email, website
- contactPerson, contactPhone, contactEmail
- paymentDays, creditLimit

### Cost (Koszty)
- id, type (FUEL/TOLL/MAINTENANCE/INSURANCE/SALARY/OTHER)
- amount, currency, date, description
- vehicleId, driverId, orderId

### Document (Dokumenty)
- id, type (CMR/INVOICE/CONTRACT/LICENSE/INSURANCE/OTHER)
- name, fileName, fileUrl, fileSize, mimeType
- description, expiryDate
- vehicleId, driverId, orderId

### DailyWorkRecord (Dzienny zapis pracy)
- id, date, driverId, vehicleId, orderId
- workHours, drivingHours, restHours
- kilometers, fuelLiters, tollCosts, otherCosts

### DriverMonthlyReport (Miesięczny raport kierowcy)
- id, month, year, driverId
- totalWorkDays, totalWorkHours, totalDrivingHours, totalRestHours
- totalKilometers, totalOrders
- baseSalary, bonuses, deductions, totalSalary

### VehicleMonthlyReport (Miesięczny raport pojazdu)
- id, month, year, vehicleId
- totalKilometers, totalFuelLiters, avgFuelConsumption
- totalFuelCost, totalTollCost, totalMaintenanceCost, totalOtherCost, totalCost
- totalOrders, totalRevenue, profitMargin
