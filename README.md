# Unity MicroFund - Setup Instructions

## Prerequisites

### 1. PostgreSQL Database
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Or use Docker
docker compose up -d postgres
```

### 2. .NET SDK (for ASP.NET Core API)
```bash
# Install .NET SDK 8.0+
dotnet --version
```

### 3. Node.js & Angular CLI (for Web App)
```bash
# Install Node.js
brew install node

# Install Angular CLI
npm install -g @angular/cli

# Install Angular Material
ng add @angular/material
```

### 4. Flutter SDK (for Mobile App)
```bash
# Install Flutter SDK
brew install flutter

# Verify installation
flutter doctor
```

---

## Project Setup

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Run ASP.NET Core API
```bash
cd UnityMicroFund.API
dotnet restore
dotnet run
```
API will be available at: `http://localhost:5000`

### 3. Run Angular Web App
```bash
cd UnityMicroFund.Web
npm install
npm start
```
Web app will be available at: `http://localhost:4200`

### 4. Run Flutter Mobile App
```bash
cd unity_micro_fund_mobile
flutter pub get
flutter run
```

---

## Project Structure

```
UnityMicroFund/
├── UnityMicroFund.API/          # ASP.NET Core Web API
│   ├── Controllers/             # API endpoints
│   ├── Models/                  # Entity models
│   ├── DTOs/                   # Data transfer objects
│   ├── Data/                   # DbContext
│   └── Services/               # Business logic
│
├── UnityMicroFund.Web/          # Angular Web Application
│   └── src/app/
│       ├── core/
│       │   ├── models/         # TypeScript interfaces
│       │   └── services/       # HTTP services
│       └── components/         # UI components
│
├── unity_micro_fund_mobile/     # Flutter Mobile App (to be created)
│
├── docker-compose.yml           # PostgreSQL container
└── SPEC.md                      # Project specification
```

---

## API Endpoints

### Members
- `GET /api/members` - List all members
- `GET /api/members/{id}` - Get member details
- `POST /api/members` - Create new member
- `PUT /api/members/{id}` - Update member
- `DELETE /api/members/{id}` - Delete member

### Investments
- `GET /api/investments` - List all investments
- `GET /api/investments/{id}` - Get investment details
- `POST /api/investments` - Create new investment
- `PUT /api/investments/{id}` - Update investment
- `DELETE /api/investments/{id}` - Delete investment

### Contributions
- `GET /api/contributions` - List contributions
- `POST /api/contributions` - Record contribution
- `PUT /api/contributions/{id}/status` - Update status
- `POST /api/contributions/generate-monthly` - Generate monthly

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

---

## Database Configuration

Update `appsettings.json` with your PostgreSQL connection:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=unitymicrofund;Username=postgres;Password=postgres"
  }
}
```
