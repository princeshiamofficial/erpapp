
export type District = {
  name: string;
  thanas?: string[]; // Optional thanas
};

export type Division = {
  division: string;
  districts: District[];
};

export const divisions: Division[] = [
  {
    division: 'Dhaka Division',
    districts: [
      {
        name: 'Dhaka',
        thanas: [
          'Dhanmondi', 'Tejgaon', 'Gulshan', 'Banani', 'Uttara East', 'Uttara West', 'Mirpur', 'Pallabi', 'Mohammadpur', 'Badda', 'Rampura', 'Shahbagh', 'Motijheel', 'Paltan', 'Wari', 'Kotwali', 'Hazaribagh', 'Kalabagan', 'New Market', 'Sabujbagh', 'Khilgaon', 'Khilkhet', 'Turag', 'Jatrabari', 'Demra'
        ],
      },
      {
        name: 'Gazipur',
        thanas: [
          'Bason', 'Gacha', 'Joydebpur', 'Kashimpur', 'Konabari', 'Pubail', 'Tongi East', 'Tongi West', 'Kaliakoir', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'
        ],
      },
      {
        name: 'Kishoreganj',
        thanas: [
          'Kishoreganj', 'Karimganj', 'Tarail', 'Hossainpur', 'Pakundia', 'Katiadi', 'Bajitpur', 'Kuliarchar', 'Bhairab', 'Austagram', 'Mithamoin', 'Itna', 'Nikli'
        ],
      },
      {
        name: 'Manikganj',
        thanas: [
          'Manikganj Sadar', 'Singair', 'Saturia', 'Harirampur', 'Shibalaya (Shibaloy)', 'Daulatpur', 'Ghior'
        ],
      },
      {
        name: 'Munshiganj',
        thanas: [
          'Gazaria', 'Lohajang (Louhajang)', 'Munshiganj Sadar', 'Sirajdikhan', 'Sreenagar', 'Tongibari'
        ],
      },
      {
        name: 'Narayanganj',
        thanas: [
          'Narayanganj', 'Fatulla Model', 'Siddhirganj', 'Bandar', 'Rupganj', 'Sonargaon', 'Araihazar'
        ],
      },
      {
        name: 'Narsingdi',
        thanas: [
          'Narsingdi', 'Raipura', 'Shibpur', 'Belabo', 'Monohardi (Monohordi)', 'Palash'
        ],
      },
      {
        name: 'Tangail',
        thanas: [
          'Tangail', 'Delduar', 'Nagarpur', 'Mirzapur', 'Basail', 'Sakhipur', 'Kalihati', 'Ghatail', 'Madhupur', 'Dhanbari', 'Gopalpur', 'Bhuapur', 'Jamuna'
        ],
      },
      {
        name: 'Faridpur',
        thanas: [
          'Kotwali', 'Madhukhali', 'Boalmari', 'Alfadanga', 'Nagarkanda', 'Bhanga (Vanga)', 'Sadarpur', 'Saltha', 'Char Bhadrasan'
        ],
      },
      {
        name: 'Gopalganj',
        thanas: [
          'Gopalganj', 'Kotalipara', 'Kashiani', 'Muksudpur', 'Tungipara'
        ],
      },
      {
        name: 'Madaripur',
        thanas: [
          'Madaripur/Shibchar', 'Kalkini', 'Rajoir', 'Dasar'
        ],
      },
      {
        name: 'Rajbari',
        thanas: [
          'Rajbari', 'Goalanda', 'Pangsha', 'Baliakandi', 'Kalukhali'
        ],
      },
      {
        name: 'Shariatpur',
        thanas: [
          'Shariatpur', 'Damudya', 'Naria', 'Zanjira (Janjira)', 'Bhedarganj', 'Gosairhat', 'Vedorgaon (Vedorgonj/Sakhipur)'
        ],
      },
    ],
  },
  // Add other divisions here if needed
];
