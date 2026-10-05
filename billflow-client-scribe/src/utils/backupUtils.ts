export const createBackup = (data: any) => {
  const backup = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data: data
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const restoreBackup = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        if (backup.version && backup.data) {
          resolve(backup.data);
        } else {
          reject(new Error('Format de sauvegarde invalide'));
        }
      } catch (error) {
        reject(new Error('Fichier de sauvegarde corrompu'));
      }
    };
    reader.readAsText(file);
  });
};
