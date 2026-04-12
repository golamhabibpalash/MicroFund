# Unity MicroFund - Investment Group Management Platform

## 1. Project Overview

- **Project Name**: MicroFund
- **Bundle Identifier**: com.microfund.app
- **Core Functionality**: A mobile application for managing a collective investment group where members contribute monthly installments, track their shares, and view investment portfolios with full transparency.
- **Target Users**: Group of friends/family members pooling money for investments
- **iOS Version Support**: iOS 12.0+

---

## 2. UI/UX Specification

### Screen Structure

1. **Splash Screen** - App logo and loading
2. **Home Screen** - Dashboard with summary stats
3. **Members Screen** - List of all members with search
4. **Member Detail Screen** - Individual member profile
5. **Add Member Screen** - Registration form for new members
6. **Investments Screen** - List of all investments
7. **Investment Detail Screen** - Individual investment details
8. **Add Investment Screen** - Form to add new investment
9. **Contributions Screen** - Monthly contribution tracking
10. **Settings Screen** - App settings

### Navigation Structure

- Bottom Navigation Bar with 4 tabs:
  - Home (Dashboard)
  - Members
  - Investments
  - Settings

### Visual Design

#### Color Palette
- **Primary**: #2E7D32 (Forest Green - represents growth/money)
- **Primary Dark**: #1B5E20
- **Primary Light**: #4CAF50
- **Secondary**: #FFC107 (Amber - for highlights)
- **Background**: #F5F5F5
- **Surface**: #FFFFFF
- **Error**: #D32F2F
- **Text Primary**: #212121
- **Text Secondary**: #757575
- **Divider**: #BDBDBD

#### Typography
- **Font Family**: SF Pro Display (system default)
- **Heading 1**: 28px, Bold
- **Heading 2**: 24px, SemiBold
- **Heading 3**: 20px, SemiBold
- **Body Large**: 16px, Regular
- **Body**: 14px, Regular
- **Caption**: 12px, Regular

#### Spacing System (8pt grid)
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **xxl**: 48px

### Widgets

#### Custom Widgets
1. **MemberCard** - Displays member summary (avatar, name, total contribution, status)
2. **InvestmentCard** - Shows investment summary (name, amount, return %, date)
3. **ContributionCard** - Monthly contribution record
4. **StatCard** - Dashboard statistics card
5. **ProfileAvatar** - Circular avatar with initials fallback
6. **CustomTextField** - Styled text input
7. **CustomButton** - Primary/Secondary buttons
8. **StatusBadge** - Active/Inactive status indicator
9. **EmptyState** - Empty list placeholder

#### Widget States
- Default
- Pressed (0.95 scale, 100ms)
- Disabled (0.5 opacity)
- Loading (circular indicator)

---

## 3. Functionality Specification

### Core Features

#### 3.1 Member Management (Priority: High)
- View list of all members with avatar, name, total contribution
- Search/filter members by name
- View individual member profile with:
  - Personal info (name, phone, email, join date)
  - Total contributions made
  - Number of installments paid
  - Current share value
  - Investment history
  - Payment status
- Add new member via registration form

#### 3.2 Member Registration Form
- Full Name (required)
- Phone Number (required)
- Email (optional)
- Monthly Contribution Amount (required)
- Start Date (required)
- Emergency Contact (optional)
- Terms & Conditions acceptance

#### 3.3 Investment Tracking (Priority: High)
- View all investments
- Investment types: Stocks, Real Estate, Business, Savings, Other
- Investment details:
  - Name and description
  - Principal amount
  - Current value
  - Return percentage
  - Date invested
  - Assigned members
- Add new investment
- View profit/loss per investment

#### 3.4 Contribution Management (Priority: High)
- Track monthly contributions
- View contribution history
- Monthly contribution amount (configurable, default: $100)
- Payment status: Paid, Pending, Overdue
- Auto-calculate shares based on contribution ratio

#### 3.5 Dashboard (Priority: High)
- Total pool amount
- Total members count
- Monthly contribution total
- Active investments count
- Total returns
- Quick stats cards

#### 3.6 Transaction Management (Priority: High)
- Approved members can create transactions
- Transaction types: Fund, Refund
- Transaction fields:
  - TransferFor (purpose of transfer)
  - Amount (transaction amount)
  - TransferBy (user who initiated)
  - CreatedBy (creator)
  - CreatedAt (creation timestamp)
  - IsApproved (approval status)
  - RefNo (unique reference number)
  - Remarks (optional notes)
  - Status (Fund/Refund)
- Admin approval workflow:
  - Transactions start as Pending
  - Admin/Manager can approve or reject
  - Approved Fund transactions add to account balance
  - Approved Refund transactions subtract from account balance
- Reference number auto-generation (TXN-YYYY-NNNNNN)

#### 3.7 Account Management (Priority: High)
- Various account types supported:
  - MasterAccount (main fund)
  - OperatingFund (day-to-day operations)
  - ReserveFund (emergency reserves)
  - InvestmentFund (investment pool)
  - EmergencyFund (contingency)
  - Other (custom accounts)
- Account fields:
  - Name
  - Description
  - AccountType
  - Balance (current balance)
  - Banking Information:
    - BankName
    - AccountHolderName
    - AccountNumber
    - RoutingNumber
    - SwiftCode
    - IBAN
    - BranchName
    - BranchAddress
    - BankPhone
    - BankEmail
  - IsActive
- Track total funded and refunded per account
- CRUD operations for admin:
  - Create new accounts with banking details
  - View all accounts in card layout
  - Edit account information
  - Delete accounts (with validation)

### User Interactions
- Pull to refresh on lists
- Swipe to delete (with confirmation)
- Tap to view details
- FAB for adding new items
- Modal bottom sheets for quick actions

### Data Handling
- **Local Storage**: SQLite via sqflite package
- **State Management**: Provider pattern
- **Data Models**: Member, Investment, Contribution, Account, Transaction

### Edge Cases & Error Handling
- Empty states with illustrations
- Form validation with inline errors
- Network-independent (fully offline)
- Data persistence across app restarts

---

## 4. Technical Specification

### Required Packages
```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.1
  sqflite: ^2.3.0
  path: ^1.8.3
  intl: ^0.18.1
  uuid: ^4.2.1
```

### Project Structure
```
lib/
├── main.dart
├── app.dart
├── models/
│   ├── member.dart
│   ├── investment.dart
│   └── contribution.dart
├── providers/
│   ├── member_provider.dart
│   ├── investment_provider.dart
│   └── contribution_provider.dart
├── screens/
│   ├── home_screen.dart
│   ├── members_screen.dart
│   ├── member_detail_screen.dart
│   ├── add_member_screen.dart
│   ├── investments_screen.dart
│   ├── investment_detail_screen.dart
│   ├── add_investment_screen.dart
│   └── settings_screen.dart
├── widgets/
│   ├── member_card.dart
│   ├── investment_card.dart
│   ├── stat_card.dart
│   ├── custom_text_field.dart
│   ├── custom_button.dart
│   └── empty_state.dart
├── services/
│   └── database_service.dart
├── utils/
│   ├── constants.dart
│   └── helpers.dart
└── theme/
    └── app_theme.dart
```

### Asset Requirements
- App icon (1024x1024)
- Empty state illustrations (optional, use icons instead)
- No external fonts (use system fonts)

---

## 5. Database Schema

### Members Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| name | TEXT | NOT NULL |
| phone | TEXT | NOT NULL |
| email | TEXT | |
| monthlyAmount | REAL | NOT NULL |
| joinDate | TEXT | NOT NULL |
| emergencyContact | TEXT | |
| isActive | INTEGER | DEFAULT 1 |
| createdAt | TEXT | NOT NULL |

### Investments Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| name | TEXT | NOT NULL |
| description | TEXT | |
| type | TEXT | NOT NULL |
| principalAmount | REAL | NOT NULL |
| currentValue | REAL | NOT NULL |
| dateInvested | TEXT | NOT NULL |
| createdAt | TEXT | NOT NULL |

### Contributions Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| memberId | TEXT | FOREIGN KEY |
| amount | REAL | NOT NULL |
| month | TEXT | NOT NULL |
| year | INTEGER | NOT NULL |
| status | TEXT | NOT NULL |
| paidDate | TEXT | |
| createdAt | TEXT | NOT NULL |

### MemberInvestments Table (Junction)
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| memberId | TEXT | FOREIGN KEY |
| investmentId | TEXT | FOREIGN KEY |
| sharePercentage | REAL | NOT NULL |

### Accounts Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | GUID | PRIMARY KEY |
| name | TEXT | NOT NULL, UNIQUE |
| description | TEXT | |
| accountType | TEXT | NOT NULL |
| balance | DECIMAL(18,2) | NOT NULL |
| bankName | TEXT | |
| accountHolderName | TEXT | |
| accountNumber | TEXT | |
| routingNumber | TEXT | |
| swiftCode | TEXT | |
| branchName | TEXT | |
| branchAddress | TEXT | |
| bankPhone | TEXT | |
| bankEmail | TEXT | |
| iban | TEXT | |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdBy | TEXT | |
| createdAt | DATETIME | NOT NULL |
| updatedAt | DATETIME | NOT NULL |

### Transactions Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | GUID | PRIMARY KEY |
| refNo | TEXT | NOT NULL, UNIQUE |
| transferFor | TEXT | NOT NULL |
| amount | DECIMAL(18,2) | NOT NULL |
| status | TEXT | NOT NULL (Fund/Refund) |
| approvalStatus | TEXT | NOT NULL (Pending/Approved/Rejected) |
| remarks | TEXT | |
| approvedBy | GUID | FOREIGN KEY |
| approvedAt | DATETIME | |
| transferById | GUID | FOREIGN KEY |
| createdById | GUID | FOREIGN KEY |
| accountId | GUID | FOREIGN KEY |
| createdAt | DATETIME | NOT NULL |
| updatedAt | DATETIME | NOT NULL |
