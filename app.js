
document.getElementById('roiForm').addEventListener('submit', function(e){
    e.preventDefault();

    const annualCost = parseFloat(document.getElementById('annualCost').value);
    const savingsPct = parseFloat(document.getElementById('savingsPct').value);
    const systemPrice = parseFloat(document.getElementById('systemPrice').value);

    const annualSavings = annualCost * (savingsPct / 100);
    const payback = systemPrice / annualSavings;

    document.getElementById('results').innerHTML =
        `<h3>Estimated Annual Savings: $${annualSavings.toFixed(0)}</h3>
         <h3>Estimated Payback: ${payback.toFixed(1)} years</h3>`;
});
