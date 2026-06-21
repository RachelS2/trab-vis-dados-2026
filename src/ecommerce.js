import { loadDb } from './config';

export class ECommerce {
    db;
    conn;
    table = 'ecommerce';

    async init() {
        this.db = await loadDb();
        this.conn = await this.db.connect();

        const response = await fetch('/data/ecommerce_orders_dataset.csv');
        const buffer = new Uint8Array(await response.arrayBuffer());

        await this.db.registerFileBuffer(
            'ecommerce_orders_dataset.csv',
            buffer
        );

        await this.conn.query(`
            CREATE OR REPLACE TABLE ${this.table} AS
            SELECT *
            FROM read_csv_auto('ecommerce_orders_dataset.csv')
        `);
    }

    async query(sql) {
        if (!this.db || !this.conn)
            throw new Error(
                'Database not initialized. Please call init() first.'
            );

        const result = await this.conn.query(sql);

        return result.toArray().map(row => row.toJSON());
    }

    async test(limit = 10) {
        return this.query(`
            SELECT *
            FROM ${this.table}
            LIMIT ${limit}
        `);
    }
}