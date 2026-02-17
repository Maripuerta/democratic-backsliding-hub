# DATA TEMPLATE GUIDE

This document serves as a comprehensive guide for populating the `countryData.json` file with data sourced from V-Dem, ERT, BTI, and DEED for the 24 Latin American countries.

## Overview
The `countryData.json` file is essential for maintaining and analyzing democratic backsliding in Latin America. It collates various metrics and indicators from widely recognized datasets to provide a clear picture of each country's situation.

## 1. Dataset Sources
### V-Dem (Varieties of Democracy)
- **Website**: [V-Dem](https://v-dem.net/)
- **Data Metrics**: Includes measures related to electoral processes, liberal democracy, and more.

### ERT (Economic Research Institute)
- **Website**: [ERT](https://ert.org/)
- **Data Metrics**: Economic performance indicators and governance.

### BTI (Bertelsmann Transformation Index)
- **Website**: [BTI](https://www.bti-project.org/en/home/)
- **Data Metrics**: Governance and transformation in developing countries.

### DEED (Democracy, Equity, and Development)
- **Website**: [DEED](https://deed.org/)
- **Data Metrics**: Measures the intersection of development and democratic practices.

## 2. Population Instructions
### Step 1: Gather Data
For each country, navigate to the respective dataset's website. Ensure you filter the data specifically for the 24 Latin American countries:
1. Argentina
2. Belize
3. Bolivia
4. Brazil
5. Chile
6. Colombia
7. Costa Rica
8. Cuba
9. Dominican Republic
10. Ecuador
11. El Salvador
12. Guatemala
13. Honduras
14. Mexico
15. Nicaragua
16. Panama
17. Paraguay
18. Peru
19. Uruguay
20. Venezuela
21. Jamaica
22. Trinidad and Tobago
23. Guyana
24. Suriname

### Step 2: Structure Data
Organize the data in a structured format. Below is an example structure for one country:
```json
"Argentina": {
    "V-Dem": { /* Insert relevant measures */ },
    "ERT": { /* Insert relevant measures */ },
    "BTI": { /* Insert relevant measures */ },
    "DEED": { /* Insert relevant measures */ }
},
```
### Step 3: Validate Data
Once populated, review the `countryData.json` file for any inconsistencies or missing data entries.

### Step 4: Commit Changes
Make sure to commit your changes with a clear and descriptive message, e.g., "Populated countryData.json with data for Argentina."

## 3. Final Checks
Ensure all 24 countries are represented in the `countryData.json` file before final submission. It’s crucial for maintaining the integrity of data analysis related to democratic backsliding.

## Conclusion
This guide aims to streamline the process of populating the `countryData.json` with crucial data for analyzing democratic governance in Latin America. For any inquiries, please contact the project maintainer.

