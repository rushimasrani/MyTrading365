--
-- PostgreSQL database dump
--

\restrict Ljs3QUqhR30YQsQCWg2T13dg1CJplbOeaRv8rr1y0xNg3tpEq368ykC8WBHUIZi

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.trade_history DROP CONSTRAINT IF EXISTS trade_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rms_limits DROP CONSTRAINT IF EXISTS rms_limits_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.positions DROP CONSTRAINT IF EXISTS positions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_book DROP CONSTRAINT IF EXISTS order_book_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.capital DROP CONSTRAINT IF EXISTS capital_user_id_fkey;
DROP INDEX IF EXISTS public.idx_username;
DROP INDEX IF EXISTS public.idx_positions_user;
DROP INDEX IF EXISTS public.idx_positions_token;
DROP INDEX IF EXISTS public.idx_orders_user;
DROP INDEX IF EXISTS public.idx_order_book_user;
DROP INDEX IF EXISTS public.idx_order_book_status;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.trade_history DROP CONSTRAINT IF EXISTS trade_history_pkey;
ALTER TABLE IF EXISTS ONLY public.rms_limits DROP CONSTRAINT IF EXISTS rms_limits_pkey;
ALTER TABLE IF EXISTS ONLY public.positions DROP CONSTRAINT IF EXISTS positions_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_book DROP CONSTRAINT IF EXISTS order_book_pkey;
ALTER TABLE IF EXISTS ONLY public.instruments DROP CONSTRAINT IF EXISTS instruments_pkey;
ALTER TABLE IF EXISTS ONLY public.default_watchlist DROP CONSTRAINT IF EXISTS default_watchlist_pkey;
ALTER TABLE IF EXISTS ONLY public.capital DROP CONSTRAINT IF EXISTS capital_pkey;
ALTER TABLE IF EXISTS public.rms_limits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.positions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.default_watchlist ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.capital ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.trade_history;
DROP SEQUENCE IF EXISTS public.rms_limits_id_seq;
DROP TABLE IF EXISTS public.rms_limits;
DROP SEQUENCE IF EXISTS public.positions_id_seq;
DROP TABLE IF EXISTS public.positions;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_book;
DROP TABLE IF EXISTS public.instruments;
DROP SEQUENCE IF EXISTS public.default_watchlist_id_seq;
DROP TABLE IF EXISTS public.default_watchlist;
DROP SEQUENCE IF EXISTS public.capital_id_seq;
DROP TABLE IF EXISTS public.capital;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: capital; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capital (
    id integer NOT NULL,
    user_id character varying(50) NOT NULL,
    assigned_capital numeric(15,2) DEFAULT 0 NOT NULL,
    available_capital numeric(15,2) DEFAULT 0 NOT NULL,
    used_capital numeric(15,2) DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    allocated_m2m numeric(15,2) DEFAULT 0 NOT NULL
);


--
-- Name: capital_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.capital_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: capital_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.capital_id_seq OWNED BY public.capital.id;


--
-- Name: default_watchlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.default_watchlist (
    id integer NOT NULL,
    symbol character varying(50) NOT NULL,
    token character varying(50) NOT NULL,
    tradingsymbol character varying(100) NOT NULL,
    exchange character varying(20) NOT NULL,
    expiry character varying(50),
    instrument_type character varying(20) DEFAULT 'FUTIDX'::character varying NOT NULL,
    is_default boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: default_watchlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.default_watchlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: default_watchlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.default_watchlist_id_seq OWNED BY public.default_watchlist.id;


--
-- Name: instruments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instruments (
    token character varying(50) NOT NULL,
    tradingsymbol character varying(100) NOT NULL,
    exchange character varying(20) NOT NULL,
    expiry character varying(50),
    instrument_type character varying(20),
    lot_size integer DEFAULT 1 NOT NULL
);


--
-- Name: order_book; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_book (
    id text NOT NULL,
    user_id text NOT NULL,
    instrument text NOT NULL,
    token text NOT NULL,
    exchange text DEFAULT 'FONSE'::text,
    side text NOT NULL,
    order_type text NOT NULL,
    quantity integer NOT NULL,
    price numeric(14,2) DEFAULT 0,
    executed_price numeric(14,2) DEFAULT 0,
    status text DEFAULT 'PENDING'::text NOT NULL,
    sl_price numeric(14,2) DEFAULT 0,
    disclosed_qty integer DEFAULT 0,
    remaining_qty integer NOT NULL,
    account_name text,
    oid text,
    created_at timestamp without time zone DEFAULT now(),
    executed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    blocked_margin numeric(14,2) DEFAULT 0,
    reject_reason text DEFAULT ''::text,
    exch character varying(20),
    tid character varying(50),
    etrdnum character varying(50),
    eordnum character varying(50),
    CONSTRAINT order_book_order_type_check CHECK ((order_type = ANY (ARRAY['MARKET'::text, 'LIMIT'::text]))),
    CONSTRAINT order_book_side_check CHECK ((side = ANY (ARRAY['BUY'::text, 'SELL'::text]))),
    CONSTRAINT order_book_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'EXECUTED'::text, 'CANCELLED'::text, 'REJECTED'::text])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    instrument character varying(100) NOT NULL,
    token character varying(50) NOT NULL,
    quantity integer NOT NULL,
    price numeric(15,2) NOT NULL,
    execution_price numeric(15,2) NOT NULL,
    side character varying(10) NOT NULL,
    order_type character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    exch character varying(20),
    oid character varying(50),
    tid character varying(50),
    etrdnum character varying(50),
    eordnum character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    user_id character varying(50) NOT NULL,
    instrument character varying(100) NOT NULL,
    token character varying(50) NOT NULL,
    buy_qty integer DEFAULT 0 NOT NULL,
    buy_avg numeric(15,4) DEFAULT 0 NOT NULL,
    sell_qty integer DEFAULT 0 NOT NULL,
    sell_avg numeric(15,4) DEFAULT 0 NOT NULL,
    net_quantity integer DEFAULT 0 NOT NULL,
    average_price numeric(15,4) DEFAULT 0 NOT NULL,
    m2m numeric(15,2) DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: rms_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rms_limits (
    id integer NOT NULL,
    user_id character varying(50) NOT NULL,
    instrument character varying(100) NOT NULL,
    max_order_qty integer DEFAULT 0 NOT NULL,
    max_net_qty integer DEFAULT 0 NOT NULL,
    exchange character varying(20) NOT NULL,
    trade_start time without time zone DEFAULT '00:00:00'::time without time zone NOT NULL,
    trade_end time without time zone DEFAULT '23:59:59'::time without time zone NOT NULL
);


--
-- Name: rms_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rms_limits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rms_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rms_limits_id_seq OWNED BY public.rms_limits.id;


--
-- Name: trade_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trade_history (
    id character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    instrument character varying(100) NOT NULL,
    quantity integer NOT NULL,
    price numeric(15,2) NOT NULL,
    side character varying(10) NOT NULL,
    pnl numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(50) NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'CLIENT'::character varying NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_user_id character varying(50),
    max_loss_limit numeric(15,2)
);


--
-- Name: capital id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital ALTER COLUMN id SET DEFAULT nextval('public.capital_id_seq'::regclass);


--
-- Name: default_watchlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_watchlist ALTER COLUMN id SET DEFAULT nextval('public.default_watchlist_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: rms_limits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rms_limits ALTER COLUMN id SET DEFAULT nextval('public.rms_limits_id_seq'::regclass);


--
-- Name: capital capital_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital
    ADD CONSTRAINT capital_pkey PRIMARY KEY (id);


--
-- Name: default_watchlist default_watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_watchlist
    ADD CONSTRAINT default_watchlist_pkey PRIMARY KEY (id);


--
-- Name: instruments instruments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruments
    ADD CONSTRAINT instruments_pkey PRIMARY KEY (token);


--
-- Name: order_book order_book_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_book
    ADD CONSTRAINT order_book_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: rms_limits rms_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rms_limits
    ADD CONSTRAINT rms_limits_pkey PRIMARY KEY (id);


--
-- Name: trade_history trade_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_history
    ADD CONSTRAINT trade_history_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_order_book_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_book_status ON public.order_book USING btree (status);


--
-- Name: idx_order_book_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_book_user ON public.order_book USING btree (user_id);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_positions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_token ON public.positions USING btree (token);


--
-- Name: idx_positions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_user ON public.positions USING btree (user_id);


--
-- Name: idx_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_username ON public.users USING btree (username);


--
-- Name: capital capital_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital
    ADD CONSTRAINT capital_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_book order_book_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_book
    ADD CONSTRAINT order_book_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: positions positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rms_limits rms_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rms_limits
    ADD CONSTRAINT rms_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trade_history trade_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_history
    ADD CONSTRAINT trade_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Ljs3QUqhR30YQsQCWg2T13dg1CJplbOeaRv8rr1y0xNg3tpEq368ykC8WBHUIZi

