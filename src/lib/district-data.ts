
export type District = {
  name: string;
  // Thanas are now optional and not included in the default data structure for simplicity.
  // They can be added later if needed.
  thanas?: string[];
};

export type Division = {
  division: string;
  districts: District[];
};

// Data based on the provided JSON structure for divisions and districts of Bangladesh.
const divisionData = [
  {
    "name": "Dhaka",
    "districts": [ "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail" ]
  },
  {
    "name": "Chattogram",
    "districts": [ "Chattogram", "Cox’s Bazar", "Cumilla", "Brahmanbaria", "Chandpur", "Feni", "Lakshmipur", "Noakhali", "Khagrachari", "Bandarban", "Rangamati" ]
  },
  {
    "name": "Khulna",
    "districts": [ "Khulna", "Bagerhat", "Satkhira", "Jessore", "Jhenaidah", "Magura", "Narail", "Chuadanga", "Meherpur", "Kushtia" ]
  },
  {
    "name": "Rajshahi",
    "districts": [ "Rajshahi", "Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Sirajganj" ]
  },
  {
    "name": "Barishal",
    "districts": [ "Barishal", "Barguna", "Bhola", "Jhalokathi", "Patuakhali", "Pirojpur" ]
  },
  {
    "name": "Sylhet",
    "districts": [ "Sylhet", "Habiganj", "Moulvibazar", "Sunamganj" ]
  },
  {
    "name": "Rangpur",
    "districts": [ "Rangpur", "Dinajpur", "Kurigram", "Gaibandha", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon" ]
  },
  {
    "name": "Mymensingh",
    "districts": [ "Mymensingh", "Jamalpur", "Netrokona", "Sherpur" ]
  }
];

// Transform the raw data to match the expected 'Division' type structure.
export const divisions: Division[] = divisionData.map(division => ({
  division: division.name, // The top-level name is the division name
  districts: division.districts.map(districtName => ({
    name: districtName,
    thanas: [] // Thanas array is initialized as empty for future use
  }))
}));
