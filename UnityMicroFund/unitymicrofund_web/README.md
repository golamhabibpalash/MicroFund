# UnityMicroFund

A full-stack web application for managing a microfund investment system. Track member contributions, manage investments across various types, process transactions, and generate reports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 21 with Angular Material |
| Backend | ASP.NET Core 10 (.NET) |
| Database | MariaDB |
| Authentication | JWT Bearer tokens |
| Real-time | SignalR (chat functionality) |
| Charts | Chart.js / ng2-charts |
| PDF Export | jsPDF with AutoTable |
| API Docs | Swagger/OpenAPI |

## Features

- **Dashboard** - Overview with statistics and key metrics
- **Member Management** - Track members with personal, banking, and emergency contact info
- **Contributions** - Monthly payment tracking (Paid/Pending/Overdue)
- **Investments** - Manage stocks, real estate, business, and savings investments
- **Transactions** - Transfer management with approval workflow
- **Accounts** - Financial account management
- **Reports** - Financial reporting with PDF export
- **Chat** - Real-time messaging via SignalR
- **User Management** - Admin and user role management
- **Activity & Audit Logs** - System activity tracking
- **Notifications** - In-app notification system

## Project Structure

```
UnityMicroFund/
├── unitymicrofund_web/    # Angular 21 frontend application
└── UnityMicroFund.API/    # ASP.NET Core Web API backend
```

## Getting Started

### Prerequisites

- Node.js 18+
- .NET 10 SDK
- MariaDB

### Backend Setup

```bash
cd UnityMicroFund.API
dotnet restore
dotnet run
```

The API will be available at `http://localhost:5000` with Swagger UI at `/swagger`.

### Frontend Setup

```bash
cd unitymicrofund_web
npm install
ng serve
```

The application will be available at `http://localhost:4200`.

### Database Configuration

Update `appsettings.json` in the API project with your MariaDB connection string:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=unitymicrofund;User=root;Password=yourpassword;"
  }
}
```

## Default Credentials

- **Admin Email**: admin@unitymicrofund.com
- **Admin Password**: Admin@123
