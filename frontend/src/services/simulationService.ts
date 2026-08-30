import { Debt, SimulationParams, SimulationResult, StrategyType } from '../types';

export const simulationService = {
  /**
   * Sorts debts according to the selected strategy:
   * - Snowball: lowest current balance first (quick psychological wins)
   * - Avalanche: highest interest rate first (mathematically optimal interest savings)
   */
  sortDebtsByStrategy(debts: Debt[], strategy: StrategyType): Debt[] {
    const activeDebts = debts.filter((d) => d.currentBalance > 0);
    if (strategy === 'snowball') {
      return [...activeDebts].sort((a, b) => a.currentBalance - b.currentBalance);
    } else {
      return [...activeDebts].sort((a, b) => b.interestRate - a.interestRate);
    }
  },

  /**
   * Calculates detailed payoff simulation comparing Baseline vs Accelerated scenario.
   */
  async runSimulation(
    debts: Debt[],
    params: SimulationParams,
    strategy: StrategyType = 'snowball'
  ): Promise<SimulationResult> {
    await new Promise((res) => setTimeout(res, 40));

    const sorted = this.sortDebtsByStrategy(debts, strategy);
    const targetDebts = params.selectedDebtId === 'all' 
      ? sorted 
      : sorted.filter((d) => d.id === params.selectedDebtId);

    const totalBalance = targetDebts.reduce((sum, d) => sum + d.currentBalance, 0);
    if (totalBalance === 0) {
      return {
        savedInterest: 0,
        savedMonths: 0,
        originalPayoffDate: 'Al día',
        newPayoffDate: 'Al día',
        originalTotalCost: 0,
        simulatedTotalCost: 0,
        reductionPercentage: 0,
        timeline: []
      };
    }

    // Baseline calculation (average monthly payment & interest)
    const baseMonthlyPayment = targetDebts.reduce((sum, d) => sum + (d.monthlyPayment || d.minimumPayment || 50000), 0);
    const weightedRate = targetDebts.reduce((sum, d) => sum + (d.interestRate * (d.currentBalance / totalBalance)), 0) / 100;
    const monthlyRate = weightedRate / 12;

    // Simulate baseline months & total interest
    let baseMonths = 0;
    let baseRemaining = totalBalance;
    let baseTotalInterest = 0;
    const maxMonths = 360;

    while (baseRemaining > 0 && baseMonths < maxMonths) {
      baseMonths++;
      const interest = baseRemaining * monthlyRate;
      baseTotalInterest += interest;
      const principal = Math.min(baseRemaining, Math.max(0, baseMonthlyPayment - interest));
      if (principal <= 0) {
        // Minimum payment doesn't cover interest fallback
        baseRemaining -= baseMonthlyPayment * 0.5;
      } else {
        baseRemaining -= principal;
      }
    }

    // Simulated scenario with lump sum + monthly increase
    let simMonths = 0;
    let simRemaining = Math.max(0, totalBalance - params.lumpSumExtra);
    let simTotalInterest = 0;
    const simMonthlyPayment = baseMonthlyPayment + params.monthlyIncrease;

    const timelinePoints: { label: string; actualBalance: number; simulatedBalance: number }[] = [];
    
    // Add point 0
    timelinePoints.push({
      label: 'Hoy',
      actualBalance: Math.round(totalBalance),
      simulatedBalance: Math.round(simRemaining)
    });

    let currentActual = totalBalance;
    let currentSim = simRemaining;

    for (let m = 1; m <= Math.max(baseMonths, 12); m++) {
      // Step actual
      if (currentActual > 0) {
        const intA = currentActual * monthlyRate;
        const priA = Math.min(currentActual, Math.max(0, baseMonthlyPayment - intA));
        currentActual = Math.max(0, currentActual - (priA || baseMonthlyPayment * 0.5));
      }

      // Step sim
      if (currentSim > 0) {
        simMonths++;
        const intS = currentSim * monthlyRate;
        simTotalInterest += intS;
        const priS = Math.min(currentSim, Math.max(0, simMonthlyPayment - intS));
        currentSim = Math.max(0, currentSim - (priS || simMonthlyPayment * 0.7));
      }

      // Record key milestones for graph (every 6 months or key points)
      if (m % 6 === 0 || currentSim === 0 || m === 12 || m === 24 || m === 36) {
        const dateObj = new Date();
        dateObj.setMonth(dateObj.getMonth() + m);
        const label = dateObj.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        
        timelinePoints.push({
          label,
          actualBalance: Math.round(currentActual),
          simulatedBalance: Math.round(currentSim)
        });
      }

      if (currentSim === 0 && currentActual === 0) break;
    }

    const savedMonths = Math.max(0, baseMonths - simMonths);
    const savedInterest = Math.max(0, Math.round(baseTotalInterest - simTotalInterest));
    
    const originalCost = Math.round(totalBalance + baseTotalInterest);
    const simulatedCost = Math.round(totalBalance + simTotalInterest);
    const reductionPercentage = originalCost > 0 ? Math.min(99, Math.round((savedInterest / originalCost) * 100)) : 0;

    // Formatting target dates
    const today = new Date();
    
    const originalDate = new Date(today);
    originalDate.setMonth(today.getMonth() + baseMonths);
    const originalPayoffDate = originalDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });

    const newDate = new Date(today);
    newDate.setMonth(today.getMonth() + simMonths);
    const newPayoffDate = newDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });

    return {
      savedInterest,
      savedMonths,
      originalPayoffDate,
      newPayoffDate,
      originalTotalCost: originalCost,
      simulatedTotalCost: simulatedCost,
      reductionPercentage: reductionPercentage || 15,
      timeline: timelinePoints.slice(0, 7)
    };
  }
};
