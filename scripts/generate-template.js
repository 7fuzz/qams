const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(process.cwd(), 'public/templates');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'test_case_import_template.xlsx');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const data = [
    {
        scenario: 'Login',
        title: 'Login dengan email terdaftar dan password yang benar',
        type: 'Positive',
        priority: 'P0 - Critical',
        automation_status: 'Manual',
        requirement_link: '',
        estimated_duration: 5,
        precondition: 'User is registered',
        steps: '1. Open Login Page\n2. Enter email\n3. Enter valid password\n4. Click Login',
        test_data: 'email: test@example.com',
        expected_result: 'Dashboard should be displayed'
    },
    {
        scenario: '',
        title: 'Login menggunakan email yang terdaftar dan password yang salah',
        type: 'Negative',
        priority: 'P1 - High',
        automation_status: 'Manual',
        requirement_link: '',
        estimated_duration: 3,
        precondition: '',
        steps: '1. Open Login Page\n2. Enter valid email\n3. Enter WRONG password\n4. Click Login',
        test_data: '',
        expected_result: 'Error message "Invalid credentials" shown'
    }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");

// Adjust column widths
const wscols = [
    { wch: 15 }, // scenario
    { wch: 40 }, // title
    { wch: 10 }, // type
    { wch: 15 }, // priority
    { wch: 15 }, // automation_status
    { wch: 20 }, // requirement_link
    { wch: 10 }, // duration
    { wch: 20 }, // precondition
    { wch: 40 }, // steps
    { wch: 20 }, // test_data
    { wch: 30 }, // expected_result
];
worksheet['!cols'] = wscols;

// Add Data Validations (Dropdowns)
// Priority is column D (index 3)
// Automation is column E (index 4)
// Type is column C (index 2)

// Note: SheetJS doesn't natively support data validation in the community version's json_to_sheet easily
// but we can add the hint for the user.

XLSX.writeFile(workbook, OUTPUT_FILE);
console.log('Template generated at:', OUTPUT_FILE);
