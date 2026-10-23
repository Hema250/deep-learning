/**
 * Chart.js Analytics & CNN-LSTM Model Performance Visualization
 */

function renderModelMetricsCharts(metrics) {
    if (!metrics) return;

    // 1. Loss & Accuracy Curves
    const ctxHistory = document.getElementById('historyChart');
    if (ctxHistory && metrics.history) {
        new Chart(ctxHistory, {
            type: 'line',
            data: {
                labels: metrics.history.loss.map((_, i) => `Epoch ${i + 1}`),
                datasets: [
                    {
                        label: 'Train Accuracy',
                        data: metrics.history.accuracy,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Val Accuracy',
                        data: metrics.history.val_accuracy,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Train Loss',
                        data: metrics.history.loss,
                        borderColor: '#8b5cf6',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'Val Loss',
                        data: metrics.history.val_loss,
                        borderColor: '#f43f5e',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af' } }
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 2. Confusion Matrix Bar Chart
    const ctxCM = document.getElementById('confusionMatrixChart');
    if (ctxCM && metrics.confusion_matrix) {
        const cm = metrics.confusion_matrix;
        const tn = cm[0][0], fp = cm[0][1], fn = cm[1][0], tp = cm[1][1];

        new Chart(ctxCM, {
            type: 'bar',
            data: {
                labels: ['True Negative (Normal)', 'False Positive', 'False Negative', 'True Positive (Violence)'],
                datasets: [{
                    label: 'Sample Sequences',
                    data: [tn, fp, fn, tp],
                    backgroundColor: ['#10b981', '#f59e0b', '#f43f5e', '#06b6d4'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}
