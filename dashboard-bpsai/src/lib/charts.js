export const questionsData = {
  labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  datasets: [{
    label: "Questions per Month",
    data: [1200,1350,1100,1400,1600,1800,1750,1900,2100,2300,2200,2400],
    borderColor: "#003366",
    backgroundColor: "rgba(0,51,102,0.1)",
    tension: 0.4,
    fill: true
  }]
};

export const intentData = {
  labels: ["Data Requests","Greetings","Help","Feedback","Other"],
  datasets: [{
    data: [65,15,10,7,3]
  }]
};

export const questionTypesData = {
  labels: ["Unique","Repeated"],
  datasets: [{
    data: [72,28]
  }]
};
