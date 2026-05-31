-- Добавить колонки для хранения аудио в таблицу Works
-- Запускать только если колонок ещё нет (например, при обновлении старой БД)

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Works') AND name = 'audio_data'
)
BEGIN
    ALTER TABLE Works ADD audio_data VARBINARY(MAX) NULL;
    ALTER TABLE Works ADD audio_mime NVARCHAR(50)   NULL;
    PRINT 'Колонки audio_data и audio_mime добавлены.';
END
ELSE
BEGIN
    PRINT 'Колонки уже существуют, пропускаем.';
END
GO
