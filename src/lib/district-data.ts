
export type District = {
  name: string;
  aliases?: string[];
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
    "districts": [
      { "name": "Dhaka" },
      { "name": "Faridpur" },
      { "name": "Gazipur", "aliases": ["গাজীপুর"] },
      { "name": "Gopalganj" },
      { "name": "Kishoreganj" },
      { "name": "Madaripur" },
      { "name": "Manikganj" },
      { "name": "Munshiganj" },
      { "name": "Narayanganj" },
      { "name": "Narsingdi" },
      { "name": "Rajbari" },
      { "name": "Shariatpur" },
      { "name": "Tangail" }
    ]
  },
  {
    "name": "Chattogram",
    "districts": [
      { "name": "Chattogram" },
      { "name": "Cox’s Bazar", "aliases": ["Cox's Bazar", "Coxs Bazar", "Cox Bazar"] },
      { "name": "Cumilla" },
      { "name": "Brahmanbaria" },
      { "name": "Chandpur" },
      { "name": "Feni" },
      { "name": "Lakshmipur" },
      { "name": "Noakhali" },
      { "name": "Khagrachari" },
      { "name": "Bandarban" },
      { "name": "Rangamati" }
    ]
  },
  {
    "name": "Khulna",
    "districts": [
      { "name": "Khulna" },
      { "name": "Bagerhat" },
      { "name": "Satkhira" },
      { "name": "Jessore" },
      { "name": "Jhenaidah" },
      { "name": "Magura" },
      { "name": "Narail" },
      { "name": "Chuadanga" },
      { "name": "Meherpur" },
      { "name": "Kushtia" }
    ]
  },
  {
    "name": "Rajshahi",
    "districts": [
      { "name": "Rajshahi" },
      { "name": "Bogura" },
      { "name": "Chapainawabganj" },
      { "name": "Joypurhat" },
      { "name": "Naogaon" },
      { "name": "Natore" },
      { "name": "Pabna" },
      { "name": "Sirajganj" }
    ]
  },
  {
    "name": "Barishal",
    "districts": [
      { "name": "Barishal" },
      { "name": "Barguna" },
      { "name": "Bhola" },
      { "name": "Jhalokathi" },
      { "name": "Patuakhali" },
      { "name": "Pirojpur" }
    ]
  },
  {
    "name": "Sylhet",
    "districts": [
      { "name": "Sylhet" },
      { "name": "Habiganj" },
      { "name": "Moulvibazar" },
      { "name": "Sunamganj" }
    ]
  },
  {
    "name": "Rangpur",
    "districts": [
      { "name": "Rangpur" },
      { "name": "Dinajpur" },
      { "name": "Kurigram" },
      { "name": "Gaibandha" },
      { "name": "Lalmonirhat" },
      { "name": "Nilphamari" },
      { "name": "Panchagarh" },
      { "name": "Thakurgaon" }
    ]
  },
  {
    "name": "Mymensingh",
    "districts": [
      { "name": "Mymensingh" },
      { "name": "Jamalpur" },
      { "name": "Netrokona" },
      { "name": "Sherpur" }
    ]
  }
];

// Transform the raw data to match the expected 'Division' type structure.
export const divisions: Division[] = divisionData.map(division => ({
  division: division.name,
  districts: division.districts.map(district => {
    if (typeof district === 'string') {
      return { name: district, thanas: [], aliases: [] };
    }
    return {
      name: district.name,
      aliases: district.aliases || [],
      thanas: [], // Thanas are not used for now
    };
  })
}));
