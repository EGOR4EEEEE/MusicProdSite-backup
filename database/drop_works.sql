-- Удаление таблицы Works из базы данных MusicProd
-- Запускать в SSMS при подключении к базе MusicProd

USE MusicProd;
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Works')
BEGIN
    DROP TABLE Works;
    PRINT 'Таблица Works удалена.';
END
ELSE
BEGIN
    PRINT 'Таблица Works не найдена, пропускаем.';
END
GO
